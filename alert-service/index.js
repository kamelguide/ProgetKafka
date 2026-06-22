const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const db = require('./database');
const { startKafka } = require('./kafka');

// Load protobuf definition
const PROTO_PATH = path.resolve(process.env.PROTO_PATH || '../proto/alert.proto');
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true
});

const alertProto = grpc.loadPackageDefinition(packageDefinition).alert;

/**
 * gRPC Handler: Lists all generated alerts.
 */
const listAlerts = async (call, callback) => {
  try {
    const rows = await db.all('SELECT * FROM alerts ORDER BY id DESC');
    const alerts = rows.map(row => ({
      id: row.id.toString(),
      incidentId: row.incidentId.toString(),
      riskLevel: row.riskLevel,
      message: row.message,
      createdAt: row.createdAt
    }));
    callback(null, { alerts });
  } catch (error) {
    console.error('Error in listAlerts implementation:', error.message);
    callback({
      code: grpc.status.INTERNAL,
      message: 'Failed to list alerts from database.'
    });
  }
};

/**
 * gRPC Handler: Lists alerts related to a specific incident.
 */
const getAlertsByIncident = async (call, callback) => {
  const { incidentId } = call.request;
  try {
    const rows = await db.all('SELECT * FROM alerts WHERE incidentId = ? ORDER BY id DESC', [incidentId]);
    const alerts = rows.map(row => ({
      id: row.id.toString(),
      incidentId: row.incidentId.toString(),
      riskLevel: row.riskLevel,
      message: row.message,
      createdAt: row.createdAt
    }));
    callback(null, { alerts });
  } catch (error) {
    console.error('Error in getAlertsByIncident implementation:', error.message);
    callback({
      code: grpc.status.INTERNAL,
      message: 'Failed to retrieve alerts by incident ID.'
    });
  }
};

const main = () => {
  const server = new grpc.Server();
  server.addService(alertProto.AlertService.service, {
    listAlerts,
    getAlertsByIncident
  });

  const port = process.env.PORT || 50052;
  server.bindAsync(`0.0.0.0:${port}`, grpc.ServerCredentials.createInsecure(), (err, portBound) => {
    if (err) {
      console.error(`Failed to bind Alert gRPC Server:`, err.message);
      return;
    }
    console.log(`Alert gRPC Service running at http://0.0.0.0:${portBound}`);
    
    // Launch Kafka consumer
    startKafka();
  });
};

main();

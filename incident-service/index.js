const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const db = require('./database');
const kafkaProducer = require('./kafka-producer');

// Load protobuf definition
const PROTO_PATH = path.resolve(process.env.PROTO_PATH || '../proto/incident.proto');
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true
});

const incidentProto = grpc.loadPackageDefinition(packageDefinition).incident;

/**
 * Creates an incident in SQLite and publishes a event to Kafka.
 */
const createIncident = async (call, callback) => {
  const { title, description, severity } = call.request;
  const createdAt = new Date().toISOString();
  const status = 'OPEN';

  try {
    const result = await db.run(
      'INSERT INTO incidents (title, description, severity, status, createdAt) VALUES (?, ?, ?, ?, ?)',
      [title, description, severity, status, createdAt]
    );

    const newIncident = {
      id: result.id.toString(),
      title,
      description,
      severity,
      status,
      createdAt
    };

    console.log(`Incident stored in database with ID: ${newIncident.id}`);

    // Publish Kafka Event asynchronously
    try {
      await kafkaProducer.sendIncidentCreated(newIncident);
    } catch (kafkaErr) {
      console.error('Kafka event generation failed, but DB record was persisted:', kafkaErr.message);
    }

    callback(null, newIncident);
  } catch (error) {
    console.error('Error in createIncident implementation:', error.message);
    callback({
      code: grpc.status.INTERNAL,
      message: 'Failed to write incident record to the database.'
    });
  }
};

/**
 * Retrieves a single incident from SQLite.
 */
const getIncident = async (call, callback) => {
  const { id } = call.request;

  try {
    const row = await db.get('SELECT * FROM incidents WHERE id = ?', [id]);
    if (!row) {
      return callback({
        code: grpc.status.NOT_FOUND,
        message: `Incident with ID ${id} was not found.`
      });
    }

    callback(null, {
      id: row.id.toString(),
      title: row.title,
      description: row.description,
      severity: row.severity,
      status: row.status,
      createdAt: row.createdAt
    });
  } catch (error) {
    console.error('Error in getIncident implementation:', error.message);
    callback({
      code: grpc.status.INTERNAL,
      message: 'Database query execution failed.'
    });
  }
};

/**
 * Retrieves all incidents from SQLite.
 */
const listIncidents = async (call, callback) => {
  try {
    const rows = await db.all('SELECT * FROM incidents ORDER BY id DESC');
    const incidents = rows.map(row => ({
      id: row.id.toString(),
      title: row.title,
      description: row.description,
      severity: row.severity,
      status: row.status,
      createdAt: row.createdAt
    }));

    callback(null, { incidents });
  } catch (error) {
    console.error('Error in listIncidents implementation:', error.message);
    callback({
      code: grpc.status.INTERNAL,
      message: 'Database listing query failed.'
    });
  }
};

/**
 * Updates an incident's status.
 */
const updateIncidentStatus = async (call, callback) => {
  const { id, status } = call.request;

  try {
    const row = await db.get('SELECT * FROM incidents WHERE id = ?', [id]);
    if (!row) {
      return callback({
        code: grpc.status.NOT_FOUND,
        message: `Incident with ID ${id} was not found.`
      });
    }

    await db.run('UPDATE incidents SET status = ? WHERE id = ?', [status, id]);

    console.log(`Incident ${id} updated to status: ${status}`);

    callback(null, {
      id: row.id.toString(),
      title: row.title,
      description: row.description,
      severity: row.severity,
      status: status,
      createdAt: row.createdAt
    });
  } catch (error) {
    console.error('Error in updateIncidentStatus implementation:', error.message);
    callback({
      code: grpc.status.INTERNAL,
      message: 'Failed to update database record.'
    });
  }
};

const main = () => {
  const server = new grpc.Server();
  server.addService(incidentProto.IncidentService.service, {
    createIncident,
    getIncident,
    listIncidents,
    updateIncidentStatus
  });

  const port = process.env.PORT || 50051;
  server.bindAsync(`0.0.0.0:${port}`, grpc.ServerCredentials.createInsecure(), (err, portBound) => {
    if (err) {
      console.error(`Failed to start gRPC Server:`, err.message);
      return;
    }
    console.log(`Incident gRPC Service running at http://0.0.0.0:${portBound}`);
  });
};

main();

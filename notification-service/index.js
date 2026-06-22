const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const db = require('./database');
const { startKafka } = require('./kafka');

// Load protobuf definition
const PROTO_PATH = path.resolve(process.env.PROTO_PATH || '../proto/notification.proto');
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true
});

const notificationProto = grpc.loadPackageDefinition(packageDefinition).notification;

/**
 * gRPC Handler: Lists all notification logs.
 */
const listNotifications = async (call, callback) => {
  try {
    const rows = await db.all('SELECT * FROM notifications ORDER BY id DESC');
    const notifications = rows.map(row => ({
      id: row.id.toString(),
      alertId: row.alertId.toString(),
      recipient: row.recipient,
      message: row.message,
      sentAt: row.sentAt
    }));
    callback(null, { notifications });
  } catch (error) {
    console.error('Error in listNotifications implementation:', error.message);
    callback({
      code: grpc.status.INTERNAL,
      message: 'Failed to list notification logs.'
    });
  }
};

const main = () => {
  const server = new grpc.Server();
  server.addService(notificationProto.NotificationService.service, {
    listNotifications
  });

  const port = process.env.PORT || 50053;
  server.bindAsync(`0.0.0.0:${port}`, grpc.ServerCredentials.createInsecure(), (err, portBound) => {
    if (err) {
      console.error(`Failed to bind Notification gRPC Server:`, err.message);
      return;
    }
    console.log(`Notification gRPC Service running at http://0.0.0.0:${portBound}`);
    
    // Launch Kafka consumer
    startKafka();
  });
};

main();

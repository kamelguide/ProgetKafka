const path = require('path');
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');

// Paths to proto files
const INCIDENT_PROTO_PATH = path.resolve(__dirname, process.env.INCIDENT_PROTO_PATH || '../../proto/incident.proto');
const ALERT_PROTO_PATH = path.resolve(__dirname, process.env.ALERT_PROTO_PATH || '../../proto/alert.proto');
const NOTIFICATION_PROTO_PATH = path.resolve(__dirname, process.env.NOTIFICATION_PROTO_PATH || '../../proto/notification.proto');

const loaderOptions = {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true
};

// Synchronously load proto packages
const incidentDef = protoLoader.loadSync(INCIDENT_PROTO_PATH, loaderOptions);
const incidentProto = grpc.loadPackageDefinition(incidentDef).incident;

const alertDef = protoLoader.loadSync(ALERT_PROTO_PATH, loaderOptions);
const alertProto = grpc.loadPackageDefinition(alertDef).alert;

const notificationDef = protoLoader.loadSync(NOTIFICATION_PROTO_PATH, loaderOptions);
const notificationProto = grpc.loadPackageDefinition(notificationDef).notification;

// Resolve endpoints
const incidentUrl = process.env.INCIDENT_SERVICE_URL || 'localhost:50051';
const alertUrl = process.env.ALERT_SERVICE_URL || 'localhost:50052';
const notificationUrl = process.env.NOTIFICATION_SERVICE_URL || 'localhost:50053';

console.log(`Connecting gRPC Clients to:\n - Incident Service: ${incidentUrl}\n - Alert Service: ${alertUrl}\n - Notification Service: ${notificationUrl}`);

// Instantiate gRPC Clients
const incidentClient = new incidentProto.IncidentService(incidentUrl, grpc.credentials.createInsecure());
const alertClient = new alertProto.AlertService(alertUrl, grpc.credentials.createInsecure());
const notificationClient = new notificationProto.NotificationService(notificationUrl, grpc.credentials.createInsecure());

// Promise wrapper for Incident client operations
const incidentService = {
  createIncident: (params) => {
    return new Promise((resolve, reject) => {
      incidentClient.createIncident(params, (err, response) => {
        if (err) reject(err);
        else resolve(response);
      });
    });
  },
  getIncident: (params) => {
    return new Promise((resolve, reject) => {
      incidentClient.getIncident(params, (err, response) => {
        if (err) reject(err);
        else resolve(response);
      });
    });
  },
  listIncidents: (params = {}) => {
    return new Promise((resolve, reject) => {
      incidentClient.listIncidents(params, (err, response) => {
        if (err) reject(err);
        else resolve(response.incidents || []);
      });
    });
  },
  updateIncidentStatus: (params) => {
    return new Promise((resolve, reject) => {
      incidentClient.updateIncidentStatus(params, (err, response) => {
        if (err) reject(err);
        else resolve(response);
      });
    });
  }
};

// Promise wrapper for Alert client operations
const alertService = {
  listAlerts: (params = {}) => {
    return new Promise((resolve, reject) => {
      alertClient.listAlerts(params, (err, response) => {
        if (err) reject(err);
        else resolve(response.alerts || []);
      });
    });
  },
  getAlertsByIncident: (params) => {
    return new Promise((resolve, reject) => {
      alertClient.getAlertsByIncident(params, (err, response) => {
        if (err) reject(err);
        else resolve(response.alerts || []);
      });
    });
  }
};

// Promise wrapper for Notification client operations
const notificationService = {
  listNotifications: (params = {}) => {
    return new Promise((resolve, reject) => {
      notificationClient.listNotifications(params, (err, response) => {
        if (err) reject(err);
        else resolve(response.notifications || []);
      });
    });
  }
};

module.exports = {
  incidentService,
  alertService,
  notificationService
};

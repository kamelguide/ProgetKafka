const { incidentService, alertService, notificationService } = require('../grpc-client');

const resolvers = {
  Query: {
    incidents: async () => {
      try {
        return await incidentService.listIncidents({});
      } catch (err) {
        console.error('GraphQL Query error in incidents resolver:', err.message);
        throw new Error('Incident gRPC service is unavailable or returned an error.');
      }
    },
    incident: async (_, { id }) => {
      try {
        return await incidentService.getIncident({ id });
      } catch (err) {
        console.error(`GraphQL Query error in incident(${id}) resolver:`, err.message);
        throw new Error(`Incident with ID ${id} could not be retrieved.`);
      }
    },
    alerts: async () => {
      try {
        return await alertService.listAlerts({});
      } catch (err) {
        console.error('GraphQL Query error in alerts resolver:', err.message);
        throw new Error('Alert gRPC service is unavailable or returned an error.');
      }
    },
    alertsByIncident: async (_, { incidentId }) => {
      try {
        return await alertService.getAlertsByIncident({ incidentId });
      } catch (err) {
        console.error(`GraphQL Query error in alertsByIncident(${incidentId}) resolver:`, err.message);
        throw new Error(`Alerts for Incident ID ${incidentId} could not be retrieved.`);
      }
    },
    notifications: async () => {
      try {
        return await notificationService.listNotifications({});
      } catch (err) {
        console.error('GraphQL Query error in notifications resolver:', err.message);
        throw new Error('Notification gRPC service is unavailable or returned an error.');
      }
    }
  },

  Mutation: {
    createIncident: async (_, { title, description, severity }) => {
      try {
        return await incidentService.createIncident({
          title,
          description: description || '',
          severity
        });
      } catch (err) {
        console.error('GraphQL Mutation error in createIncident:', err.message);
        throw new Error('Failed to create incident via gRPC service.');
      }
    },
    updateIncidentStatus: async (_, { id, status }) => {
      try {
        return await incidentService.updateIncidentStatus({ id, status });
      } catch (err) {
        console.error(`GraphQL Mutation error in updateIncidentStatus(${id}, ${status}):`, err.message);
        throw new Error('Failed to update incident status via gRPC service.');
      }
    }
  },

  Incident: {
    alerts: async (parent) => {
      try {
        // Resolve nested alerts using incident ID
        return await alertService.getAlertsByIncident({ incidentId: parent.id });
      } catch (err) {
        console.error(`GraphQL resolver error fetching alerts for Incident ID ${parent.id}:`, err.message);
        return [];
      }
    }
  }
};

module.exports = resolvers;

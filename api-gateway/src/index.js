const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const express = require('express');
const cors = require('cors');
const { ApolloServer } = require('@apollo/server');
const { expressMiddleware } = require('@apollo/server/express4');

const { incidentService, alertService, notificationService } = require('./grpc-client');
const typeDefs = require('./graphql/typeDefs');
const resolvers = require('./graphql/resolvers');

const app = express();
const PORT = process.env.PORT || 4000;

// Enable CORS and JSON parsing
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve Static Frontend Dashboard
app.use(express.static(path.join(__dirname, '../public')));

// ==========================================
// REST API ENDPOINTS
// ==========================================

/**
 * POST /incidents
 * Creates a security incident by calling the Incident gRPC service.
 */
app.post('/incidents', async (req, res) => {
  const { title, description, severity } = req.body;
  if (!title || !severity) {
    return res.status(400).json({ error: 'Title and severity are required fields.' });
  }

  try {
    const result = await incidentService.createIncident({ title, description: description || '', severity });
    return res.status(201).json(result);
  } catch (err) {
    console.error('REST POST /incidents error:', err.message);
    return res.status(500).json({ error: 'Failed to create incident via gRPC service.' });
  }
});

/**
 * GET /incidents
 * Lists all security incidents from the Incident gRPC service.
 */
app.get('/incidents', async (req, res) => {
  try {
    const result = await incidentService.listIncidents({});
    return res.status(200).json(result);
  } catch (err) {
    console.error('REST GET /incidents error:', err.message);
    return res.status(500).json({ error: 'Failed to retrieve incidents from gRPC service.' });
  }
});

/**
 * GET /incidents/:id
 * Retrieves a single incident by ID.
 */
app.get('/incidents/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await incidentService.getIncident({ id });
    return res.status(200).json(result);
  } catch (err) {
    console.error(`REST GET /incidents/${id} error:`, err.message);
    if (err.code === 5) { // gRPC NOT_FOUND code is 5
      return res.status(404).json({ error: `Incident with ID ${id} not found.` });
    }
    return res.status(500).json({ error: 'Failed to retrieve incident details.' });
  }
});

/**
 * PATCH /incidents/:id/status
 * Updates the status of an incident.
 */
app.patch('/incidents/:id/status', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  if (!status) {
    return res.status(400).json({ error: 'Status field is required.' });
  }

  try {
    const result = await incidentService.updateIncidentStatus({ id, status });
    return res.status(200).json(result);
  } catch (err) {
    console.error(`REST PATCH /incidents/${id}/status error:`, err.message);
    if (err.code === 5) {
      return res.status(404).json({ error: `Incident with ID ${id} not found.` });
    }
    return res.status(500).json({ error: 'Failed to update incident status.' });
  }
});

/**
 * GET /alerts
 * Helper endpoint to retrieve all security alerts.
 */
app.get('/alerts', async (req, res) => {
  try {
    const result = await alertService.listAlerts({});
    return res.status(200).json(result);
  } catch (err) {
    console.error('REST GET /alerts error:', err.message);
    return res.status(500).json({ error: 'Failed to retrieve alerts.' });
  }
});

/**
 * GET /notifications
 * Helper endpoint to retrieve all notification logs.
 */
app.get('/notifications', async (req, res) => {
  try {
    const result = await notificationService.listNotifications({});
    return res.status(200).json(result);
  } catch (err) {
    console.error('REST GET /notifications error:', err.message);
    return res.status(500).json({ error: 'Failed to retrieve notifications.' });
  }
});

// ==========================================
// GRAPHQL MIDDLEWARE INITIALIZATION
// ==========================================
const startApolloServer = async () => {
  const apolloServer = new ApolloServer({
    typeDefs,
    resolvers,
  });

  await apolloServer.start();
  app.use('/graphql', expressMiddleware(apolloServer));
  console.log(`GraphQL API route initialized at /graphql`);
};

// Start both Servers
const bootstrap = async () => {
  await startApolloServer();

  app.listen(PORT, () => {
    console.log(`=======================================================`);
    console.log(`  Cyber Security API Gateway Listening on Port: ${PORT}`);
    console.log(`  - REST Endpoint: http://localhost:${PORT}`);
    console.log(`  - GraphQL Sandbox: http://localhost:${PORT}/graphql`);
    console.log(`  - SOC Dashboard UI: http://localhost:${PORT}`);
    console.log(`=======================================================`);
  });
};

bootstrap().catch(err => {
  console.error('Gateway Bootstrapping Failed:', err.message);
});

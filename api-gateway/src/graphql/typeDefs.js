const typeDefs = `#graphql
  type Incident {
    id: ID!
    title: String!
    description: String
    severity: String!
    status: String!
    createdAt: String!
    alerts: [Alert!]!
  }

  type Alert {
    id: ID!
    incidentId: ID!
    riskLevel: String!
    message: String!
    createdAt: String!
  }

  type Notification {
    id: ID!
    alertId: ID!
    recipient: String!
    message: String!
    sentAt: String!
  }

  type Query {
    incidents: [Incident!]!
    incident(id: ID!): Incident
    alerts: [Alert!]!
    alertsByIncident(incidentId: ID!): [Alert!]!
    notifications: [Notification!]!
  }

  type Mutation {
    createIncident(title: String!, description: String, severity: String!): Incident!
    updateIncidentStatus(id: ID!, status: String!): Incident!
  }
`;

module.exports = typeDefs;

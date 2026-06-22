const { Kafka } = require('kafkajs');

const broker = process.env.KAFKA_BROKER || 'localhost:9092';
const kafka = new Kafka({
  clientId: 'incident-service',
  brokers: [broker],
  retry: {
    initialRetryTime: 300,
    retries: 10
  }
});

const producer = kafka.producer();

let isConnected = false;

const connectProducer = async () => {
  if (isConnected) return;
  console.log(`Connecting Kafka Producer to broker: ${broker}...`);
  try {
    await producer.connect();
    isConnected = true;
    console.log('Kafka Producer connected successfully.');
  } catch (error) {
    console.error('Failed to connect Kafka Producer:', error.message);
    // Attempt retry after a delay to allow Kafka container to spin up
    setTimeout(connectProducer, 5000);
  }
};

const sendIncidentCreated = async (incident) => {
  if (!isConnected) {
    console.warn('Kafka producer not connected. Queueing message locally or discarding...');
    // We try to connect again
    await connectProducer();
    if (!isConnected) {
      throw new Error('Kafka broker is unavailable. Cannot publish event.');
    }
  }

  const topic = 'incident-created';
  const payload = {
    incidentId: incident.id.toString(),
    title: incident.title,
    severity: incident.severity,
    timestamp: incident.createdAt
  };

  try {
    await producer.send({
      topic,
      messages: [
        {
          key: incident.id.toString(),
          value: JSON.stringify(payload)
        }
      ]
    });
    console.log(`Successfully published ${topic} event for Incident ID: ${incident.id}`);
  } catch (error) {
    console.error(`Error sending message to topic ${topic}:`, error.message);
    throw error;
  }
};

// Start connection process
connectProducer();

module.exports = { sendIncidentCreated };

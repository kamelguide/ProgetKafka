const { Kafka } = require('kafkajs');
const db = require('./database');

const broker = process.env.KAFKA_BROKER || 'localhost:9092';
const kafka = new Kafka({
  clientId: 'alert-service',
  brokers: [broker],
  retry: {
    initialRetryTime: 300,
    retries: 10
  }
});

const producer = kafka.producer();
const consumer = kafka.consumer({ groupId: 'alert-service-group' });

let isProducerConnected = false;

const startKafka = async () => {
  try {
    console.log(`Connecting Kafka Producer for Alert Service...`);
    await producer.connect();
    isProducerConnected = true;
    console.log('Kafka Producer connected.');

    console.log(`Connecting Kafka Consumer for Alert Service...`);
    await consumer.connect();
    console.log('Kafka Consumer connected.');

    // Subscribe to incident-created
    await consumer.subscribe({ topic: 'incident-created', fromBeginning: true });
    console.log('Subscribed to topic: incident-created');

    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        const valueStr = message.value.toString();
        console.log(`Received event on topic ${topic}: ${valueStr}`);
        
        try {
          const payload = JSON.parse(valueStr);
          const { incidentId, title, severity } = payload;

          // Generate alert properties
          const riskLevel = severity || 'MEDIUM';
          const alertMessage = `Security Alert: System detected incident ID ${incidentId} ('${title}') with severity '${severity}'. Threat isolation protocols initialized.`;
          const createdAt = new Date().toISOString();

          // Save to sqlite database
          const result = await db.run(
            'INSERT INTO alerts (incidentId, riskLevel, message, createdAt) VALUES (?, ?, ?, ?)',
            [incidentId, riskLevel, alertMessage, createdAt]
          );

          console.log(`Stored alert record in DB with ID: ${result.id}`);

          // Publish to alert-generated topic
          const alertEvent = {
            alertId: result.id.toString(),
            incidentId: incidentId.toString(),
            riskLevel,
            message: alertMessage,
            timestamp: createdAt
          };

          await sendAlertGenerated(alertEvent);
        } catch (err) {
          console.error('Error processing incident-created Kafka event:', err.message);
        }
      }
    });

  } catch (error) {
    console.error('Error in Kafka Alert Service lifecycle:', error.message);
    // Retry initialization in 5 seconds
    setTimeout(startKafka, 5000);
  }
};

const sendAlertGenerated = async (alertEvent) => {
  if (!isProducerConnected) {
    console.warn('Kafka producer not ready. Attempting reconnect to publish...');
    try {
      await producer.connect();
      isProducerConnected = true;
    } catch (err) {
      console.error('Reconnection to Kafka failed, dropping event:', err.message);
      return;
    }
  }

  const topic = 'alert-generated';
  try {
    await producer.send({
      topic,
      messages: [
        {
          key: alertEvent.alertId,
          value: JSON.stringify(alertEvent)
        }
      ]
    });
    console.log(`Successfully published ${topic} event for Alert ID: ${alertEvent.alertId}`);
  } catch (error) {
    console.error(`Failed to publish message to topic ${topic}:`, error.message);
  }
};

module.exports = { startKafka };

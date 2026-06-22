const { Kafka } = require('kafkajs');
const db = require('./database');

const broker = process.env.KAFKA_BROKER || 'localhost:9092';
const kafka = new Kafka({
  clientId: 'notification-service',
  brokers: [broker],
  retry: {
    initialRetryTime: 300,
    retries: 10
  }
});

const consumer = kafka.consumer({ groupId: 'notification-service-group' });

const startKafka = async () => {
  try {
    console.log(`Connecting Kafka Consumer for Notification Service...`);
    await consumer.connect();
    console.log('Kafka Consumer connected.');

    // Subscribe to alert-generated
    await consumer.subscribe({ topic: 'alert-generated', fromBeginning: true });
    console.log('Subscribed to topic: alert-generated');

    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        const valueStr = message.value.toString();
        console.log(`Received event on topic ${topic}: ${valueStr}`);

        try {
          const payload = JSON.parse(valueStr);
          const { alertId, incidentId, riskLevel, message: alertMsg } = payload;

          // Route notification recipient based on severity/risk
          let recipient = 'sec-ops-noc@company.local';
          if (riskLevel === 'HIGH' || riskLevel === 'CRITICAL') {
            recipient = 'incident-response-lead@company.local';
          }

          const notificationMsg = `[SOC SECURITY ALERT] Recipient notified. Risk: ${riskLevel}. Alert Details: ${alertMsg}`;
          const sentAt = new Date().toISOString();

          // Save notification to SQLite
          const result = await db.run(
            'INSERT INTO notifications (alertId, recipient, message, sentAt) VALUES (?, ?, ?, ?)',
            [alertId.toString(), recipient, notificationMsg, sentAt]
          );

          console.log(`Notification sent and logged in DB with ID: ${result.id} for Alert ID: ${alertId}`);
        } catch (err) {
          console.error('Error processing alert-generated Kafka event:', err.message);
        }
      }
    });

  } catch (error) {
    console.error('Error in Kafka Notification Service lifecycle:', error.message);
    // Retry initialization in 5 seconds
    setTimeout(startKafka, 5000);
  }
};

module.exports = { startKafka };

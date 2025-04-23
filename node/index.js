const express = require("express");
const axios = require("axios");
const { context, trace, propagation } = require("@opentelemetry/api");
const { NodeSDK, api } = require("@opentelemetry/sdk-node");
const { ExpressInstrumentation } = require("@opentelemetry/instrumentation-express");
const { HttpInstrumentation } = require("@opentelemetry/instrumentation-http");
const { OTLPTraceExporter } = require("@opentelemetry/exporter-trace-otlp-http");
const morgan = require("morgan");
const { resourceFromAttributes } = require("@opentelemetry/resources");
const { ATTR_SERVICE_NAME } = require("@opentelemetry/semantic-conventions");

OTEL_COLLECTOR_URL = process.env.OTEL_COLLECTOR_URL || "localhost"
PYTHON_URL = process.env.PYTHON_URL || "localhost"
PYTHON_PORT = process.env.PYTHON_PORT || "5000"

const sdk = new NodeSDK({
    resource: resourceFromAttributes({
        [ATTR_SERVICE_NAME]: "service-node",
    }),
    traceExporter: new OTLPTraceExporter({
        url: `http://${OTEL_COLLECTOR_URL}:4318/v1/traces`,
    }),
    instrumentations: [new HttpInstrumentation(), new ExpressInstrumentation()],
});

sdk.start()

process.on('SIGTERM', () => {
    sdk.shutdown()
})

const tracer = trace.getTracer("service-a");

const app = express();

app.use(morgan("dev"));

app.get("/", async (req, res) => {
    res.send("This is index")
})

app.get("/ping", async (req, res) => {
    try {
        // const isConnected = await checkConnection(sdk)
        const isConnected = true
        if (isConnected) {
            const parentCtx = propagation.extract(context.active(), req.headers);
            const span = tracer.startSpan("service-a", undefined, parentCtx);

            await context.with(trace.setSpan(parentCtx, span), async () => {
                const headers = {};
                propagation.inject(context.active(), headers);

                const data = await axios.get(`${PYTHON_URL}/pong`, { headers });

                span.end();
                res.send({ message: `Hello from Service A and ${data.data.message}` });
            });
        }
    } catch (error) {
        res.send(error.cause)
    }
});

app.listen(3000, '0.0.0.0', () => {
    console.log("✅ Service A running on :3000");
});

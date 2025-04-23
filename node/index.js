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
PYTHON_URL = process.env.PYTHON_URL || "http://localhost:4000"

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
        const parentCtx = propagation.extract(context.active(), req.headers);

        await context.with(parentCtx, async () => {
            const span = tracer.startSpan("service-a");
            await context.with(trace.setSpan(context.active(), span), async () => {
                const headers = {};
                propagation.inject(context.active(), headers);
                const data = await axios.get(`${PYTHON_URL}/pong`, { headers });
                span.end();
                res.send({ message: `Hello from Service A and ${data.data.message}` });
            })
        });
    } catch (error) {
        res.send({ message: error.cause })
    }
});

app.listen(3000, '0.0.0.0', () => {
    console.log("✅ Service A running on :3000");
});

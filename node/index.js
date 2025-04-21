const express = require("express");
const axios = require("axios");
const { context, trace, propagation } = require("@opentelemetry/api");
const { NodeSDK } = require("@opentelemetry/sdk-node");
const { ExpressInstrumentation } = require("@opentelemetry/instrumentation-express");
const { HttpInstrumentation } = require("@opentelemetry/instrumentation-http");
const { OTLPTraceExporter } = require("@opentelemetry/exporter-trace-otlp-http");
const morgan = require("morgan");
const { resourceFromAttributes } = require("@opentelemetry/resources");
const { ATTR_SERVICE_NAME } = require("@opentelemetry/semantic-conventions");

const sdk = new NodeSDK({
    resource: resourceFromAttributes({
        [ATTR_SERVICE_NAME]: "service-node",
    }),
    traceExporter: new OTLPTraceExporter({
        endpoint: "localhost:4318/v1/traces",
    }),
    instrumentations: [new HttpInstrumentation(), new ExpressInstrumentation()],
});

sdk.start();

const tracer = trace.getTracer("service-a");

const app = express();

app.use(morgan("dev"));

app.get("/ping", async (req, res) => {
    const parentCtx = propagation.extract(context.active(), req.headers);

    await context.with(parentCtx, async () => {
        const span = tracer.startSpan("service-a");
        await context.with(trace.setSpan(context.active(), span), async () => {
            const headers = {};
            propagation.inject(context.active(), headers);

            const data = await axios.get("http://localhost:8000/pong", { headers });

            console.log(data.data)
            
            span.end();
            res.send("Hello from Service A");
        });
    });
});

app.listen(3000, () => {
    console.log("✅ Service A running on :3000");
});

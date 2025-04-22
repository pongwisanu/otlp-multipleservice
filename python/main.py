from flask import Flask, request
from opentelemetry.sdk.resources import SERVICE_NAME, Resource
from opentelemetry import trace, baggage
from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.trace.propagation.tracecontext import TraceContextTextMapPropagator

resource = Resource.create(attributes={
    SERVICE_NAME: "service-python"
})

tracerProvider = TracerProvider(resource=resource)
processor = BatchSpanProcessor(OTLPSpanExporter(endpoint="http://localhost:4318/v1/traces"))
tracerProvider.add_span_processor(processor)
trace.set_tracer_provider(tracerProvider)

tracer = trace.get_tracer("service-b")

app = Flask(__name__)

@app.route("/pong", methods=["GET"])
def pong():
    headers = dict(request.headers)
    ctx = TraceContextTextMapPropagator().extract(carrier=headers)
    with tracer.start_span("service-b", context=ctx):  
        return {"message": "Hello from Service B"}

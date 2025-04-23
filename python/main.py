from flask import Flask, request
from opentelemetry.sdk.resources import SERVICE_NAME, Resource
from opentelemetry import trace, baggage
from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.trace.propagation.tracecontext import TraceContextTextMapPropagator
from dotenv import load_dotenv
import os

load_dotenv()

OTEL_COLLECTOR_URL = os.getenv("OTEL_COLLECTOR_URL" , "localhost")

resource = Resource.create(attributes={
    SERVICE_NAME: "service-python"
})

tracerProvider = TracerProvider(resource=resource)
processor = BatchSpanProcessor(OTLPSpanExporter(endpoint=f"http://{OTEL_COLLECTOR_URL}:4318/v1/traces"))
tracerProvider.add_span_processor(processor)
trace.set_tracer_provider(tracerProvider)

tracer = trace.get_tracer("service-b")

app = Flask(__name__)

@app.route("/", methods=['GET'])
def index():
    return {"message": "This is index"}

@app.route("/pong", methods=["GET"])
def pong():
    try:
        headers = dict(request.headers)
        carrier = headers
        if('Traceparent' in headers):
            carrier = {'traceparent': headers['Traceparent']}
        ctx = TraceContextTextMapPropagator().extract(carrier=carrier)
        with tracer.start_span("service-b", context=ctx):  
            return {"message": "Hello from Service B"}
    except Exception as e:
        print(e , flush=True)

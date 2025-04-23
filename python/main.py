from flask import Flask, request
from opentelemetry.sdk.resources import SERVICE_NAME, Resource
from opentelemetry import trace, baggage
from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.trace.propagation.tracecontext import TraceContextTextMapPropagator
from opentelemetry.trace import get_current_span
from dotenv import load_dotenv
import os
import requests

load_dotenv()

OTEL_COLLECTOR_URL = os.getenv("OTEL_COLLECTOR_URL" , "localhost")
GO_URL = os.getenv("GO_URL", "http://localhost:5000")

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
        ctx = TraceContextTextMapPropagator().extract(carrier=request.headers)
        with tracer.start_as_current_span("service-b", context=ctx):  
            headers = {}
            TraceContextTextMapPropagator().inject(headers)
            res = requests.get(f"{GO_URL}/pang" , headers=headers).json()
            return {"message": f"Hello from Service B and {res['message']}"}
    except Exception as e:
        return {"message": e.args}

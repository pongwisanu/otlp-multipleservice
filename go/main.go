package main

import (
	"context"
	"fmt"
	"log"
	"os"

	"github.com/gofiber/contrib/otelfiber"
	"github.com/gofiber/fiber/v2"
	"github.com/joho/godotenv"
	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracehttp"
	"go.opentelemetry.io/otel/propagation"
	"go.opentelemetry.io/otel/sdk/resource"
	sdktrace "go.opentelemetry.io/otel/sdk/trace"
	semconv "go.opentelemetry.io/otel/semconv/v1.4.0"
)

func main() {
	err := godotenv.Load()
	if err != nil {
		log.Fatalln("Error loading .env file")
	}

	OTEL_COLLECTOR_URL := os.Getenv("OTEL_COLLECTOR_URL")
	if OTEL_COLLECTOR_URL == "" {
		OTEL_COLLECTOR_URL = "localhost"
	}

	OTEL_COLLECTOR_ENDPOINT := fmt.Sprintf("http://%s:4318/v1/traces", OTEL_COLLECTOR_URL)

	ctx := context.Background()
	tp := initTracer(ctx, OTEL_COLLECTOR_ENDPOINT)
	defer func() {
		if err := tp.Shutdown(ctx); err != nil {
			log.Printf("Error shutting down tracer provider: %v", err)
		}
	}()

	otel.SetTextMapPropagator(propagation.TraceContext{})

	// Start HTTP server.
	app := fiber.New(fiber.Config{
		ReadBufferSize: 32 * 1024,
	})
	app.Use(otelfiber.Middleware())

	app.Get("/pang", pang)

	app.Listen(":5000")

}

func initTracer(ctx context.Context, endpoint string) *sdktrace.TracerProvider {
	exporter, err := otlptracehttp.New(ctx, otlptracehttp.WithEndpointURL(endpoint))
	if err != nil {
		log.Fatal(err)
	}
	tp := sdktrace.NewTracerProvider(
		sdktrace.WithSampler(sdktrace.AlwaysSample()),
		sdktrace.WithBatcher(exporter),
		sdktrace.WithResource(
			resource.NewWithAttributes(
				semconv.SchemaURL,
				semconv.ServiceNameKey.String("service-go"),
			)),
	)
	otel.SetTracerProvider(tp)
	otel.SetTextMapPropagator(propagation.NewCompositeTextMapPropagator(propagation.TraceContext{}, propagation.Baggage{}))
	return tp
}

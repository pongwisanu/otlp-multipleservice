package main

import (
	"github.com/gofiber/fiber/v2"
	"go.opentelemetry.io/otel"
)

const name = "service_go"

var (
	tracer = otel.Tracer(name)
)

type Response struct {
	Message string `json:"message"`
}

func pang(c *fiber.Ctx) error {
	_, span := tracer.Start(c.UserContext(), "service-c")
	defer span.End()
	return c.JSON(fiber.Map{
		"message": "Hello from Service C",
	})
}

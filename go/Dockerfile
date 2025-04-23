FROM golang:1.23.1 AS build

WORKDIR /usr/src/app

ADD . .

RUN CGO_ENABLED=0 GOOS=linux go build -o app

FROM alpine AS production

COPY --from=build /usr/src/app .

CMD ["./app"]
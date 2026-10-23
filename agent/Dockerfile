FROM alpine:3.20

RUN apk add --no-cache curl docker-cli

COPY agent.sh /usr/local/bin/agent.sh
RUN chmod 0755 /usr/local/bin/agent.sh

ENTRYPOINT ["/usr/local/bin/agent.sh"]

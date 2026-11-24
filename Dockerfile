FROM node:22-alpine
WORKDIR /app
COPY . .
ENV PORT=8765 DATA_DIR=/app/data
EXPOSE 8765
CMD ["node", "server.js"]

# Use the official Node.js 14 base image
FROM node:14

# Set the working directory inside the container
WORKDIR /app

# Copy package.json and package-lock.json to the working directory
COPY package*.json ./

# Install Nest CLI globally
RUN npm install -g @nestjs/cli

# Install dependencies
RUN npm install

# Copy the application code into the container
COPY . .

# Expose the port on which the Nest.js application will run
EXPOSE 3000

# Command to run the Nest.js application
CMD ["npm", "run", "start:prod"]

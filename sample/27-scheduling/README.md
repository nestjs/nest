### Task scheduling sample

`TasksService` uses `@nestjs/schedule`: a cron job runs at second 45 of every minute, an interval every 10 seconds, and a timeout once, 5 seconds after start. The application has no routes; each task writes a debug line to the log. See the [task scheduling](https://docs.nestjs.com/application/task-scheduling) chapter for more.

### Installation

`npm install`

### Running

`npm run start:dev`

### Test

`npm run test:e2e`

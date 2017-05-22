import { NestFactory } from './../src/';
import { ApplicationModule } from './modules/app.module';

const port = 3001;
const app = NestFactory.create(ApplicationModule);

app.init();
app.listen(port, (server) => {
    console.log('Application listen on port:', port);
    server.close();
    process.exit();
});
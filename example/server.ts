import { NestFactory } from './../src/';
import { ApplicationModule } from './modules/app.module';

const port = 3001;
const app = NestFactory.create(ApplicationModule);

app.listen(port, () => {
    console.log('Application listen on port:', port);
    process.exit();
}); 
import { Get, Controller, Res } from '@nestjs/common';

@Controller()
export class AppController {
	@Get()
	root(@Res() res) {
    res.render('index', { message: 'Hello world!' });
  }
}

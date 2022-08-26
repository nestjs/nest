import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { UserModule } from './user/user.module';
import { RouterModule } from '@nestjs/core';
import { PostModule } from './post/post.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { UrlGeneratorModule } from '@nestjs/core';
import { TagModule } from './tag/tag.module';
import { GlobalModule } from 'src/app/global/global.module';

@Module({
  imports: [
    GlobalModule,
    ConfigModule.forRoot({ isGlobal: true }),
    UserModule,
    PostModule,
    TagModule,
    RouterModule.register([
      {
        path: 'foobar',
        module: PostModule,
      },
    ]),
    RouterModule.register([
      {
        path: 'test',
        module: UserModule,
      },
    ]),
    // UrlGeneratorModule.forRoot({
    //   absoluteUrl: 'https://www.example.com'
    // }),
    UrlGeneratorModule.forRoot({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        absoluteUrl: configService.get<string>('ABSOLUTE_URL'),
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}

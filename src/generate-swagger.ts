import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import * as fs from 'fs';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { logger: false });

  const options = new DocumentBuilder()
    .setTitle('Masarak API')
    .setDescription('The Masarak Enterprise E-Learning API description')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
    
  const document = SwaggerModule.createDocument(app, options);
  fs.writeFileSync('../docs/mobile/swagger.json', JSON.stringify(document, null, 2));
  console.log('Swagger generated successfully at docs/mobile/swagger.json');
  process.exit(0);
}
bootstrap();

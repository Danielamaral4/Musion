import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { LastfmService } from './lastfm.service';

@Module({
  imports: [HttpModule],
  providers: [LastfmService],
  exports: [LastfmService],
})
export class LastfmModule {}

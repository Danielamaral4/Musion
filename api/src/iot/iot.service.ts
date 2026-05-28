import { Injectable } from '@nestjs/common';
import { getAverageColor } from 'fast-average-color-node';
import { PrismaService } from '../prisma/prisma.service';
import { IotAlbumColorDto } from '../dto/iot-album-color.dto';
import { IotTestColorDto } from '../dto/iot-test-color.dto';

type RgbColor = {
  red: number;
  green: number;
  blue: number;
  hexColor: string;
  isFallback: boolean;
};

@Injectable()
export class IotService {
  constructor(private readonly prisma: PrismaService) {}

  async createAlbumColorEvent(userId: number, dto: IotAlbumColorDto) {
    const color = await this.extractColorFromCover(
      dto.albumCover,
      `${dto.albumId}:${dto.albumName}`
    );

    const event = await this.prisma.iotEvent.create({
      data: {
        userId,
        albumId: dto.albumId,
        albumName: dto.albumName,
        albumCover: dto.albumCover || null,
        source: dto.source || 'AlbumDetails',
        hexColor: color.hexColor,
        red: color.red,
        green: color.green,
        blue: color.blue,
        isFallback: color.isFallback,
      },
    });

    return this.formatEvent(event);
  }

  async createTestColorEvent(userId: number, dto: IotTestColorDto) {
    const red = this.clampColor(dto.red);
    const green = this.clampColor(dto.green);
    const blue = this.clampColor(dto.blue);

    const event = await this.prisma.iotEvent.create({
      data: {
        userId,
        albumId: 'virtual-test',
        albumName: dto.albumName || 'Teste do LED Virtual',
        albumCover: null,
        source: 'VirtualLedTest',
        hexColor: this.rgbToHex(red, green, blue),
        red,
        green,
        blue,
        isFallback: false,
      },
    });

    return this.formatEvent(event);
  }

  async getCurrentState(userId: number) {
    const event = await this.prisma.iotEvent.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    if (!event) {
      return {
        id: null,
        albumId: null,
        albumName: 'Nenhum album enviado ainda',
        albumCover: null,
        source: 'Idle',
        hexColor: '#DEE0E8',
        rgb: { red: 222, green: 224, blue: 232 },
        isFallback: false,
        createdAt: null,
      };
    }

    return this.formatEvent(event);
  }

  async getHistory(userId: number, take = 20) {
    const events = await this.prisma.iotEvent.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: Math.min(Math.max(take, 1), 50),
    });

    return events.map((event) => this.formatEvent(event));
  }

  private async extractColorFromCover(albumCover?: string, fallbackSeed = ''): Promise<RgbColor> {
    if (!albumCover) {
      return { ...this.seedToColor(fallbackSeed), isFallback: true };
    }

    try {
      const color = await getAverageColor(albumCover, {
        algorithm: 'dominant',
        mode: 'precision',
      });
      const value = Array.isArray((color as any).value) ? (color as any).value : [];
      const red = this.clampColor(value[0]);
      const green = this.clampColor(value[1]);
      const blue = this.clampColor(value[2]);

      if ([red, green, blue].some((part) => Number.isNaN(part))) {
        return { ...this.seedToColor(fallbackSeed), isFallback: true };
      }

      return {
        red,
        green,
        blue,
        hexColor: (color as any).hex || this.rgbToHex(red, green, blue),
        isFallback: false,
      };
    } catch (error) {
      return { ...this.seedToColor(fallbackSeed), isFallback: true };
    }
  }

  private seedToColor(seed: string) {
    let hash = 0;

    for (let index = 0; index < seed.length; index++) {
      hash = seed.charCodeAt(index) + ((hash << 5) - hash);
      hash |= 0;
    }

    const hue = Math.abs(hash) % 360;
    const { red, green, blue } = this.hslToRgb(hue, 66, 54);

    return {
      red,
      green,
      blue,
      hexColor: this.rgbToHex(red, green, blue),
    };
  }

  private hslToRgb(h: number, s: number, l: number) {
    const saturation = s / 100;
    const lightness = l / 100;
    const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation;
    const x = chroma * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = lightness - chroma / 2;

    let red = 0;
    let green = 0;
    let blue = 0;

    if (h < 60) [red, green, blue] = [chroma, x, 0];
    else if (h < 120) [red, green, blue] = [x, chroma, 0];
    else if (h < 180) [red, green, blue] = [0, chroma, x];
    else if (h < 240) [red, green, blue] = [0, x, chroma];
    else if (h < 300) [red, green, blue] = [x, 0, chroma];
    else [red, green, blue] = [chroma, 0, x];

    return {
      red: Math.round((red + m) * 255),
      green: Math.round((green + m) * 255),
      blue: Math.round((blue + m) * 255),
    };
  }

  private clampColor(value: number) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return Number.NaN;
    return Math.min(Math.max(Math.round(parsed), 0), 255);
  }

  private rgbToHex(red: number, green: number, blue: number) {
    return `#${[red, green, blue]
      .map((part) => this.clampColor(part).toString(16).padStart(2, '0'))
      .join('')
      .toUpperCase()}`;
  }

  private formatEvent(event: any) {
    return {
      id: event.id,
      albumId: event.albumId,
      albumName: event.albumName,
      albumCover: event.albumCover,
      source: event.source,
      hexColor: event.hexColor,
      rgb: {
        red: event.red,
        green: event.green,
        blue: event.blue,
      },
      isFallback: event.isFallback,
      createdAt: event.createdAt,
    };
  }
}

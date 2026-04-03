import { ExportService } from '@ghostfolio/api/app/export/export.service';
import { UserService } from '@ghostfolio/api/app/user/user.service';
import { ConfigurationService } from '@ghostfolio/api/services/configuration/configuration.service';
import { ExportResponse } from '@ghostfolio/common/interfaces';

import { Injectable, Logger } from '@nestjs/common';
import { existsSync, mkdirSync, readdirSync, statSync, unlinkSync } from 'fs';
import { writeFile } from 'fs/promises';
import { basename, join, resolve } from 'path';

export interface BackupFileInfo {
  createdAt: string;
  fileName: string;
  sizeInBytes: number;
}

@Injectable()
export class BackupService {
  private readonly DEFAULT_BACKUP_PATH = './backups';
  private readonly DEFAULT_RETENTION_DAYS = 30;

  public constructor(
    private readonly configurationService: ConfigurationService,
    private readonly exportService: ExportService,
    private readonly userService: UserService
  ) {}

  public async createBackup(): Promise<BackupFileInfo> {
    const backupPath = this.getBackupPath();

    this.ensureBackupDirectory(backupPath);

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `ghostfolio-backup-${timestamp}.json`;
    const filePath = join(backupPath, fileName);

    const backupData = await this.gatherBackupData();

    await writeFile(filePath, JSON.stringify(backupData, null, 2), 'utf-8');

    const stats = statSync(filePath);

    Logger.log(`Backup created: ${fileName}`, 'BackupService');

    return {
      fileName,
      createdAt: stats.birthtime.toISOString(),
      sizeInBytes: stats.size
    };
  }

  public getBackups(): BackupFileInfo[] {
    const backupPath = this.getBackupPath();

    if (!existsSync(backupPath)) {
      return [];
    }

    return readdirSync(backupPath)
      .filter((file) => {
        return file.startsWith('ghostfolio-backup-') && file.endsWith('.json');
      })
      .map((fileName) => {
        const filePath = join(backupPath, fileName);
        const stats = statSync(filePath);

        return {
          fileName,
          createdAt: stats.birthtime.toISOString(),
          sizeInBytes: stats.size
        };
      })
      .sort((a, b) => {
        return b.createdAt.localeCompare(a.createdAt);
      });
  }

  public getBackupFilePath(fileName: string): string | undefined {
    const sanitizedFileName = basename(fileName);

    if (
      !sanitizedFileName.startsWith('ghostfolio-backup-') ||
      !sanitizedFileName.endsWith('.json')
    ) {
      return undefined;
    }

    const backupPath = resolve(this.getBackupPath());
    const filePath = resolve(join(backupPath, sanitizedFileName));

    if (!filePath.startsWith(backupPath)) {
      return undefined;
    }

    if (!existsSync(filePath)) {
      return undefined;
    }

    return filePath;
  }

  public deleteBackup(fileName: string): boolean {
    const filePath = this.getBackupFilePath(fileName);

    if (!filePath) {
      return false;
    }

    unlinkSync(filePath);

    Logger.log(`Backup deleted: ${fileName}`, 'BackupService');

    return true;
  }

  public cleanUpOldBackups(): number {
    const retentionDays = this.getRetentionDays();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    const backups = this.getBackups();
    let deletedCount = 0;

    for (const backup of backups) {
      if (new Date(backup.createdAt) < cutoffDate) {
        if (this.deleteBackup(backup.fileName)) {
          deletedCount++;
        }
      }
    }

    if (deletedCount > 0) {
      Logger.log(`Cleaned up ${deletedCount} old backup(s)`, 'BackupService');
    }

    return deletedCount;
  }

  private async gatherBackupData(): Promise<{
    meta: { date: string; version: string };
    users: { userId: string; export: ExportResponse }[];
  }> {
    const users = await this.userService.users({});
    const userExports: { userId: string; export: ExportResponse }[] = [];

    for (const user of users) {
      try {
        const userWithSettings = await this.userService.user({
          id: user.id
        });

        if (!userWithSettings) {
          continue;
        }

        const exportData = await this.exportService.export({
          userId: user.id,
          userSettings: userWithSettings.settings?.settings as Record<
            string,
            unknown
          > & { baseCurrency?: string }
        });

        userExports.push({
          userId: user.id,
          export: exportData
        });
      } catch (error) {
        Logger.warn(
          `Failed to export data for user ${user.id}: ${error.message}`,
          'BackupService'
        );
      }
    }

    return {
      meta: {
        date: new Date().toISOString(),
        version: '1.0.0'
      },
      users: userExports
    };
  }

  private getBackupPath(): string {
    return (
      this.configurationService.get('BACKUP_PATH') ?? this.DEFAULT_BACKUP_PATH
    );
  }

  private getRetentionDays(): number {
    return (
      this.configurationService.get('BACKUP_RETENTION_DAYS') ??
      this.DEFAULT_RETENTION_DAYS
    );
  }

  private ensureBackupDirectory(backupPath: string) {
    if (!existsSync(backupPath)) {
      mkdirSync(backupPath, { recursive: true });

      Logger.log(`Created backup directory: ${backupPath}`, 'BackupService');
    }
  }
}

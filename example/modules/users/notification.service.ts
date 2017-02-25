import { Component } from '../../../src/common/utils/component.decorator';

@Component()
export class NotificationService {
    storeNotification(data) {
        const notification = this.mapDataToNotification(data);
        // store notification
    }

    private mapDataToNotification(msg) {}
}
import { Component } from '../../../src/common/utils/component.decorator';
import { ChatGateway } from './chat.gateway';

@Component()
export class ChatService {

    constructor(private chatGateway: ChatGateway) {
        const stream$ = this.chatGateway.msgStream;
        stream$.subscribe(this.storeMessage.bind(this));
    }

    storeMessage(data) {
        // store data
    }

}
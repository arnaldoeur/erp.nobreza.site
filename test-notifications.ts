
import { NotificationService } from './services/notification.service';
import { AuthService } from './services/auth.service';
import { CompanyService } from './services/company.service';

async function test() {
    const user = AuthService.getCurrentUser() || { id: '00000000-0000-0000-0000-000000000000', email: 'test@example.com', name: 'Tester' };
    const company = await CompanyService.get();

    console.log('Starting test...');
    const res = await NotificationService.sendTestNotifications(user, company);
    console.log('Result:', res);
}

test().catch(console.error);

import Link from 'next/link';
import PageHeader from '../../components/PageHeader';

export default function StorekeeperDashboard() {
  const links = [
    { href: '/stock', label: 'Склад' },
    { href: '/receipts', label: 'Поступления' },
    { href: '/realization', label: 'Реализация' },
    { href: '/orders', label: 'Заказы' },
    { href: '/colors', label: 'Цвета' },
    { href: '/chat', label: 'Общий чат' }
  ];

  return (
    <div>
      <PageHeader
        title="Доступные страницы для кладовщика"
        showBackButton
        backHref="/"
      />

      <div className="space-y-4">
        <p className="text-sm text-gray-600">Быстрые ссылки на разделы, доступные вашей роли.</p>
        <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {links.map(link => (
            <li key={link.href}>
              <Link href={link.href} className="flex items-center justify-between border border-gray-300 rounded px-3 py-2 hover:bg-gray-50">
                <span className="text-gray-800">{link.label}</span>
                <span className="text-xs text-gray-500">{link.href}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}




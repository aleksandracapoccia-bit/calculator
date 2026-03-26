# Калькулятор стоимости исследовательского проекта

## Локальная разработка (без Docker)

### Backend (Django)

```bash
cd backend
source $HOME/.local/bin/env
uv run python manage.py runserver 8000
```

Django Admin: http://localhost:8000/admin/
Логин: `admin` / Пароль: `admin`

API: http://localhost:8000/api/calculator/structure/

### Frontend (Next.js)

```bash
cd frontend
npm run dev
```

Калькулятор: http://localhost:3000

## Локальная разработка (Docker)

```bash
docker compose up --build
```

Приложение: http://localhost
Django Admin: http://localhost/admin/

## Структура

- `backend/` — Django + DRF. Модели: Section, Module, Attribute, SelectOption. Админка для управления всеми переменными.
- `frontend/` — Next.js + Tailwind CSS. Динамический калькулятор с расчётом по кнопке и экспортом в CSV.

## Управление переменными

Через Django Admin (http://localhost/admin/) можно:

- Создавать/редактировать **секции** (например, "Дизайн исследования", "Админ блок")
- Внутри секций — **модули** (например, "Качественный", "Количественный")
- Внутри модулей — **атрибуты** трёх типов:
  - `number` — числовой ввод (ставка × количество)
  - `select` — выбор из списка (у каждой опции своя ставка)
  - `fixed` — фиксированная стоимость (вкл/выкл)
- Для select-атрибутов — **опции выбора** со своими ставками
- Связь `multiply_with` позволяет умножать стоимость одного атрибута на значение другого

## Пересоздание начальных данных

```bash
# Без Docker
cd backend
uv run python manage.py seed_calculator

# С Docker
docker compose exec backend python manage.py seed_calculator
```

---

## Деплой на VPS

### Предварительные требования на VPS

1. Docker и Docker Compose установлены
2. Пользователь добавлен в группу `docker`

### Первоначальная настройка VPS

```bash
# Создать директорию проекта
mkdir -p ~/calculator
cd ~/calculator

# Скопировать файлы (или клонировать репо для nginx.conf)
# Нужны: docker-compose.prod.yml, nginx/nginx.conf, .env
```

Создайте файл `.env` на основе `.env.example`:

```bash
cat > .env << 'EOF'
GHCR_OWNER=ваш-github-username
DJANGO_SECRET_KEY=сгенерируйте-длинный-случайный-ключ
DJANGO_DEBUG=0
DJANGO_ALLOWED_HOSTS=ip-вашего-vps
DB_NAME=calculator
DB_USER=postgres
DB_PASSWORD=надёжный-пароль
CORS_ALLOWED_ORIGINS=http://ip-вашего-vps
EOF
```

Авторизуйтесь в GHCR:

```bash
echo "GITHUB_TOKEN" | docker login ghcr.io -u YOUR_USERNAME --password-stdin
```

Запустите:

```bash
docker compose -f docker-compose.prod.yml up -d
docker compose -f docker-compose.prod.yml exec backend python manage.py migrate
docker compose -f docker-compose.prod.yml exec backend python manage.py createsuperuser
docker compose -f docker-compose.prod.yml exec backend python manage.py seed_calculator
```

### Настройка GitHub Actions (CI/CD)

В настройках репозитория (Settings → Secrets and variables → Actions) добавьте:

| Secret | Описание |
|--------|----------|
| `VPS_HOST` | IP-адрес вашего VPS |
| `VPS_USER` | Имя пользователя для SSH |
| `VPS_SSH_KEY` | Приватный SSH-ключ для доступа к VPS |

Генерация SSH-ключа:

```bash
# На локальной машине
ssh-keygen -t ed25519 -f ~/.ssh/deploy_key -N ""

# Скопировать публичный ключ на VPS
ssh-copy-id -i ~/.ssh/deploy_key.pub user@your-vps-ip

# Содержимое ~/.ssh/deploy_key добавить в GitHub Secret VPS_SSH_KEY
```

После настройки каждый `git push` в ветку `main` автоматически:
1. Собирает Docker-образы backend и frontend
2. Пушит их в GitHub Container Registry
3. Подключается к VPS по SSH
4. Обновляет контейнеры и применяет миграции

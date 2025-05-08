# Discord Benzeri Sohbet Uygulaması

Bu proje, Discord temalarında tasarlanmış tamamen işlevsel bir sohbet uygulamasıdır. Metin mesajları, sesli görüşme, görüntülü görüşme ve ekran paylaşımı özelliklerini barındırır.

## Özellikler

- Oda tabanlı sohbet sistemi
- Şifre korumalı odalar
- Gerçek zamanlı metin mesajlaşma
- WebRTC ile sesli görüşme
- WebRTC ile görüntülü görüşme
- Ekran paylaşımı
- Mesaj geçmişi (JSON dosya tabanlı veritabanı)
- Discord-benzeri arayüz

## Gereksinimler

- Node.js (v14 veya üzeri)
- npm paket yöneticisi

## Kurulum

1. Projeyi bilgisayarınıza klonlayın veya indirin.
2. Proje klasörüne terminal/komut satırı ile gidin.
3. Gerekli paketleri yükleyin:

```bash
npm install
```

Bu komut, `package.json` dosyasında belirtilen tüm bağımlılıkları (Express, Socket.io vb.) yükleyecektir.

## Çalıştırma

Uygulamayı başlatmak için:

```bash
npm start
```

veya geliştirme modunda çalıştırmak için:

```bash
npm run dev
```

Uygulama varsayılan olarak 3000 portunda çalışacaktır. Tarayıcınızdan `http://localhost:3000` adresine giderek uygulamayı kullanabilirsiniz.

## Nasıl Kullanılır

1. Açılış ekranında:
   - Kullanıcı adınızı girin
   - Katılmak istediğiniz oda adını girin
   - Oda şifresini girin
   - "Enter Room" butonuna tıklayın

2. Oda henüz oluşturulmamışsa, girdiğiniz şifre ile yeni bir oda oluşturulur. Oda zaten varsa, şifre doğrulanır.

3. Sohbet ekranında:
   - Sol tarafta metin sohbeti
   - Sağ tarafta görüntülü görüşme ve ekran paylaşımı alanı
   - Sağ üst köşede çevrimiçi kullanıcılar listesi

4. Medya kontrolleri:
   - 🎤 Voice: Sesli görüşmeyi açar/kapatır
   - 📹 Video: Kamera görüntüsünü açar/kapatır
   - 📺 Share Screen: Ekran paylaşımını başlatır/durdurur

## Teknik Detaylar

- **Backend**: Node.js ve Express
- **Gerçek Zamanlı İletişim**: Socket.io
- **Sesli ve Görüntülü İletişim**: WebRTC
- **Veritabanı**: JSON dosya tabanlı basit veritabanı
- **Frontend**: HTML, CSS, JavaScript

## Notlar

Bu uygulama, basit bir file-based JSON veritabanı kullanır. Gerçek bir üretim ortamı için, MongoDB veya PostgreSQL gibi daha dayanıklı bir veritabanı tercih edilmelidir. Ayrıca, WebRTC bağlantıları için STUN/TURN sunucuları da eklenmelidir. 
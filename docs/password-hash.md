# Parola saklama

Yeni kayıtlar ve şifre değişiklikleri **bcrypt** ile hash’lenir. Eski düz metin parolalar: kullanıcı başarılı giriş yaptığında sunucu otomatik olarak hash’e çevirir (ek işlem gerekmez).

Seed (`npm run seed`) ve yönetici panelinden verilen geçici şifreler de hash’lenerek kaydedilir.

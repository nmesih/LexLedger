# ⚖️ LexLedger — Kullanıcı Kılavuzu
### Hukuk Bürosu & Finans Yönetim Sistemi

Hoş geldiniz! **LexLedger**, hukuk büronuzun dava dosyalarını, duruşma takvimini ve vekalet ücreti/masraf akışını karmaşık tablolardan kurtarıp tek bir ekrandan, hızla ve güvenle yönetmeniz için tasarlandı.

Bu kılavuz, uygulamayı en verimli şekilde kullanabilmeniz için adım adım hazırlanmıştır.

---

## 📑 İçindekiler

1. [İlk Kurulum ve Başlangıç](#1-ilk-kurulum-ve-başlangıç)
2. [Büro İsmini Kişiselleştirme](#2-büro-ismini-kişiselleştirme)
3. [Ana Sayfa (Dashboard) ve Gizlilik Modu](#3-ana-sayfa-dashboard-ve-gizlilik-modu)
4. [Müvekkiller ve Dava Dosyaları](#4-müvekkiller-ve-dava-dosyaları)
5. [Duruşma Takvimi ve UYAP Aktarımı](#5-duruşma-takvimi-ve-uyap-aktarımı)
6. [Finans Yönetimi: Ücretler, Tahsilatlar ve Masraflar](#6-finans-yönetimi-ücretler-tahsilatlar-ve-masraflar)
7. [PDF Rapor Oluşturma](#7-pdf-rapor-oluşturma)
8. [Veri Güvenliği ve Yedekleme](#8-veri-güvenliği-ve-yedekleme)
9. [Sıkça Sorulan Sorular (SSS)](#9-sıkça-sorulan-sorular-sss)

---

## 1. İlk Kurulum ve Başlangıç

LexLedger internete ihtiyaç duymadan **%100 yerel ve çevrimdışı (offline)** çalışır.

### Mac Kullanıcıları İçin:
1. İndirdiğiniz `.dmg` dosyasına çift tıklayın.
2. Açılan pencerede **LexLedger** simgesini **Uygulamalar (Applications)** klasörüne sürükleyip bırakın.
3. *İlk açılışta:* Eğer "Geliştirici doğrulanamadı" uyarısı alırsanız; uygulamaya **Sağ Tıklayıp -> "Aç"** deyin ve onaylayın. Bu işlem yalnızca ilk sefere mahsustur.

### Windows Kullanıcıları İçin:
1. İndirdiğiniz `LexLedger.Setup.1.0.0.exe` dosyasına çift tıklayın.
2. Kurulum otomatik tamamlanacak ve masaüstünüze kısayol eklenecektir.
3. *İlk açılışta:* Windows SmartScreen mavi ekranı çıkarsa **"Ek Bilgi"** yazısına tıklayıp ardından **"Yine de Çalıştır"** butonuna basın.

---

## 2. Büro İsmini Kişiselleştirme

Uygulamayı açtığınızda sol menüdeki ve PDF raporlardaki büro unvanını kendi büronuza göre ayarlayabilirsiniz:

1. Sol menünün en altındaki **"Ayarlar"** sekmesine tıklayın.
2. **"Büro İsmi"** kutucuğuna kendi büro adınızı yazın (Örn: `Yılmaz & Ortakları Hukuk Bürosu`).
3. **"Kaydet"** butonuna basın.
4. Artık uygulamanın sol üst logosu ve oluşturacağınız tüm PDF raporlar sizin büro unvanınızla hazırlanacaktır.

---

## 3. Ana Sayfa (Dashboard) ve Gizlilik Modu

Ana sayfa, büronuzun o anki durumunu tek ekranda özetler:
* **Bekleyen Tahsilat / Kasa Durumu:** Toplam alacaklarınız, tahsil edilen ve kalan bakiye.
* **Yaklaşan Duruşmalar:** Önünüzdeki günlerde gerçekleşecek duruşmaların tarih ve saat sırasıyla listesi.
* **Aktif Dosyalar:** Büronuzdaki açık dava sayısı.

### 👁️ Gizlilik & Maskeleme Modu (Önemli Özellik!)
Odanızda bir müvekkil veya misafir otururken uygulamanızı açtığınızda finansal durumunuzu görmesini istemeyebilirsiniz.
* Ekrandaki para tutarlarının yanında bir **Göz İkonu** bulunur.
* Göz ikonuna tıkladığınızda tüm paralar `•••••• ₺` olarak maskelenir.
* Yanınızdaki kişi gittiğinde tekrar tıklayarak tutarları görünür hale getirebilirsiniz.

---

## 4. Müvekkiller ve Dava Dosyaları

### Yeni Müvekkil Ekleme:
1. Sol menüden **"Müvekkiller"** sayfasına girin.
2. Sağ üstteki **"+ Yeni Müvekkil"** butonuna tıklayın.
3. Ad-Soyad / Unvan, Telefon, T.C./VKN ve Adres bilgilerini girip kaydedin.

### Dava / Dosya Açma:
1. **"Davalar / Dosyalar"** sekmesine gelin ve **"+ Yeni Dava"** butonuna basın.
2. Davanın ait olduğu müvekkili seçin.
3. **Mahkeme Adı** (Örn: `İstanbul 4. Asliye Ticaret Mahkemesi`), **Esas Numarası** (`2024/142 E.`) ve Dava Türünü yazın.
4. Dosya aşamasını belirleyin (*Açık, Karara Çıktı, İstinafta, Temyizde, Kapandı*).

---

## 5. Duruşma Takvimi ve UYAP Aktarımı

Duruşmalarınızı tek tek elle girmekle vakit kaybetmek zorunda değilsiniz.

### UYAP'tan Takvim İndirme ve Aktarma (3 Adım):
1. **UYAP Avukat Portal**'a giriş yapın ve **"Duruşma Takvimi"** ekranına gidin.
2. İlgili ay veya dönemin takvimini **`.ics`** dosyası olarak bilgisayarınıza indirin.
3. LexLedger'da **"Takvim"** sayfasına gelin ve üstteki **"Takvim Yükle (.ics)"** butonuna tıklayarak indirdiğiniz dosyayı seçin.

> 💡 **Mükerrer Kayıt Güvencesi:** Aynı UYAP takvimini veya önceki ayları tekrar yükleseniz bile LexLedger aynı duruşmaları tespit eder ve **asla çift kayıt yapmaz**.  
> Ayrıca elle sonradan eklediğiniz veya not aldığınız duruşmalar UYAP aktarımı sırasında kesinlikle **silinmez**.

### Manuel Duruşma Ekleme:
UYAP'ta henüz görünmeyen veya harici bir duruşmanız varsa Takvim sayfasından **"+ Duruşma Ekle"** diyerek tarih, saat, mahkeme ve notlarınızı kaydedebilirsiniz.

---

## 6. Finans Yönetimi: Ücretler, Tahsilatlar ve Masraflar

Büronuzun nakit akışını eksiksiz takip edebilirsiniz:

### Vekalet Ücreti Tanımlama:
1. **"Ücretler & Ödemeler"** sayfasına girin.
2. **"+ Yeni Ücret Sözleşmesi"** butonuna tıklayın.
3. Müvekkili seçin ve anlaşılan toplam vekalet ücreti tutarını yazın.

### Parçalı Tahsilat / Ödeme Girişi:
Müvekkiliniz vekalet ücretini taksit taksit veya parça parça ödediğinde:
1. İlgili vekalet ücreti kaydının yanındaki **"Ödeme Ekle"** butonuna basın.
2. Tahsil ettiğiniz tutarı ve ödeme yöntemini (Banka Havalesi, Nakit, Kredi Kartı) seçip makbuz/dekont notunuzu yazın.
3. Sistem kalan bakiyeyi ve ödeme yüzdesini otomatik olarak güncelleyecektir.

### Masraflar:
Dava harçları, bilirkişi ücretleri veya ofis giderlerini **"Masraflar"** sekmesinden kaydederek net kârlılığınızı görebilirsiniz.

---

## 7. PDF Rapor Oluşturma

Ay sonunda veya müvekkil bilgilendirmelerinde resmi ve kurumsal dökümler alabilirsiniz:

1. Sol menüden **"Raporlar"** sayfasına gelin.
2. Sayfada büronuzun toplam gelir, bekleyen alacak ve tahsilat başarı grafiğini göreceksiniz.
3. Sağ üstteki **"PDF Olarak İndir"** butonuna basın.
4. Sistem; büronuzun adı, Türkçe karakterleri kusursuz basılmış tabloları ve finansal özet kartlarını içeren profesyonel bir PDF dosyasını bilgisayarınıza kaydedecektir.

---

## 8. Veri Güvenliği ve Yedekleme

* **Verileriniz Yalnızca Sizin Bilgisayarınızda:** LexLedger'da açtığınız hiçbir dosya, girdiğiniz hiçbir müvekkil bilgisi veya para miktarı internete aktarılmaz.
* **Otomatik Günlük Yedek:** Uygulamayı her gün ilk açtığınızda sistem arka planda veritabanınızın bir yedeğini alır. Bilgisayarınız çökse dahi yedek dosyalarınız güvendedir.

---

## 9. Sıkça Sorulan Sorular (SSS)

**S: Uygulama için internet bağlantısı gerekir mi?**  
*Cevap:* Hayır. LexLedger tamamen çevrimdışı (offline) çalışır. Adliyede, duruşma salonunda veya internet olmayan yerlerde kesintisiz kullanabilirsiniz.

**S: Yeni bir bilgisayara geçersem kayıtlarımı nasıl taşırım?**  
*Cevap:* Bilgisayarınızdaki `lexledger.db` dosyasını yeni bilgisayarınıza kopyalamanız yeterlidir. Tüm müvekkilleriniz, davalarınız ve ödemeleriniz aynen açılır.

**S: UYAP'tan takvim yüklerken daha önce elle eklediğim duruşmalar silinir mi?**  
*Cevap:* Kesinlikle silinmez. LexLedger akıllı filtreleme sayesinde elle eklenen kayıtları korur, yalnızca UYAP dosyasındaki yeni duruşmaları sisteme işler.

**S: Birden fazla avukat kendi bilgisayarında bağımsız kullanabilir mi?**  
*Cevap:* Evet. Her avukat uygulamayı kendi bilgisayarına kurarak kendi büro ismi ve kendi müvekkil portföyü ile tamamen bağımsız ve gizli bir şekilde kullanabilir.

---

> **İyi çalışmalar ve başarılı duruşmalar dileriz!**  
> *LexLedger Ekibi*

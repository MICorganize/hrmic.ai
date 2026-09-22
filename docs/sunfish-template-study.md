# SunFish template reference สำหรับ hrmic.ai

วันที่ศึกษา: 21 กันยายน 2026 (Asia/Bangkok)

สถานะ: **ศึกษาและบันทึกเท่านั้น ยังไม่อนุมัติให้เปลี่ยนโค้ดหรือหน้าตาระบบ**

## เจตนาของผู้ใช้และวิธีใช้บันทึกนี้

ผู้ใช้ต้องการให้รูปแบบของทั้งโปรเจ็ค hrmic.ai อ้างอิง SaaS SunFish Web Application โดยให้เริ่มศึกษาจาก https://dataon.com/en-th/ และจดจำรายละเอียดไว้ในโปรเจ็คก่อน ยังไม่ให้แก้ไขโค้ดใด ๆ

เอกสารนี้กับ [ทะเบียนแหล่งอ้างอิง](sunfish-template-sources.md) เป็นความจำที่เก็บไว้ใน repository เพื่ออ่านต่อในงานครั้งถัดไป ไม่ใช่การเปลี่ยน UI และไม่ใช่คำสั่งให้เริ่ม implement โดยอัตโนมัติ เมื่อมีคำสั่งปรับระบบภายหลัง ให้อ่านทั้งสองไฟล์ก่อนประเมินงานจริง

## ขอบเขตและระดับหลักฐาน

- **วัดจากหน้าเว็บ:** ตรวจ DOM, computed styles และภาพหน้าจอเว็บไซต์สาธารณะบน Chrome; viewport ที่อ่านได้จริง 1536 × 674 CSS px, devicePixelRatio 1.25
- **เห็นจากภาพ:** เปิดภาพหน้าจอแอปที่ DataOn เผยแพร่โดยตรง และดูรายละเอียดของภาพ ไม่ได้เข้าสู่แอป SunFish
- **อ่านรายการ:** อ่านหัวข้อและทะเบียนภาพในหน้าผลิตภัณฑ์หลักครบ 10 หมวด ไม่ได้ทดสอบทุกฟีเจอร์หรือเปิดทุกหน้าลูก
- **จำนวนภาพที่เปิดตรวจ:** 48 ภาพต้นทาง รวมภาพแอป ภาพมือถือ ภาพ composite และภาพประกอบการตลาด; ไม่ได้หมายถึง 48 หน้าจอเต็มที่มีรายละเอียดครบ
- **ยังไม่ยืนยัน:** interaction ภายในแอป, design tokens ของแอป, responsive ของแอปเว็บ, สิทธิ์, validation และหน้าที่ไม่เผยแพร่

เว็บไซต์ประชาสัมพันธ์กับแอป SunFish เป็นคนละผิวหน้าของผลิตภัณฑ์ ค่า CSS ที่วัดจากเว็บไซต์ไม่ใช่หลักฐานว่าภายในแอปใช้ค่าเดียวกัน ภาพหลายชิ้นเป็นภาพประกอบการตลาด มีการย่อ ครอบ หรือจัดวางบนอุปกรณ์ จึงไม่ใช้ขนาดพิกเซลในภาพเป็นขนาด component จริง

แหล่งอ้างอิงมีภาพที่แสดงปี 2021, 2022 และ 2025 และแสดง navigation ต่างกัน จึงยังยืนยันไม่ได้ว่าทุกภาพมาจาก release หรือ theme เดียวกัน

## 1. โครงแอปที่เห็นซ้ำในภาพอ้างอิง

อ้างอิงภาพ A01–A21 ในทะเบียนแหล่งอ้างอิง

| ส่วน | สิ่งที่เห็น | ข้อจำกัด |
| --- | --- | --- |
| Global header | พื้นขาว โลโก้ซ้าย ช่องค้นหาพนักงาน/ฟังก์ชัน ไอคอนทางลัดและแจ้งเตือน; ด้านขวามีองค์กร ชื่อผู้ใช้ รูป avatar และลูกศร | ตำแหน่งช่องค้นหาแตกต่างระหว่างภาพ |
| Main navigation | แบบเต็มเป็น icon + label และแบบย่อเป็นรางไอคอนแนวตั้ง | เห็นทั้งสองแบบ แต่ไม่ได้ทดสอบการยุบ/ขยายจริง |
| Active navigation | แบบเต็มมีแถบมนสีน้ำเงินเข้ม; แบบย่อมีวงกลมสีน้ำเงินหลัง icon | บางภาพเลือก Home แม้เนื้อหาเป็นหน้าโมดูล จึงไม่ใช้ภาพตัดสิน routing |
| Workspace | พื้นเกือบขาวอมฟ้า แผงเนื้อหาขาว เส้นแบ่งอ่อนและเงาบาง | สี hex และเงาของแอปยังไม่ได้วัดจาก DOM |
| Page heading | breadcrumb ซ้าย หน้า current สีน้ำเงิน; ปุ่ม action และ More ขวา | ไม่พบหลักฐานว่าทุกหน้ามีปุ่ม back |
| Context controls | filter, tabs, period selector หรือข้อมูลพนักงานอยู่เหนือเนื้อหาหลัก | เปลี่ยนตามโมดูล |
| Content | ตาราง การ์ด กราฟ แผนผัง หรือแบบ master–detail ภายใน shell เดียวกัน | ไม่ได้ทดสอบ persistence ของ state |
| Help | หลายภาพมีแท็บช่วยเหลือสีน้ำเงินแนวตั้งที่ขอบขวา | ไม่ได้เปิดหรือทดสอบ help panel |

รายการ navigation แบบเต็มที่อ่านได้จากภาพ: Home, Organization, Employee, Career, Time & Attendance, Reimbursement, Payroll, Performance, Training, Loan, Settings เป็นรายการจากภาพตัวอย่าง ไม่ใช่รายการสิทธิ์หรือเมนูทั้งหมดของผลิตภัณฑ์

## 2. ภาษาภาพและองค์ประกอบร่วมของแอป

อ้างอิง A01, A02, A05, A07, A15, A16, A21

- ผิวหลักสว่าง การ์ดขาว ขอบเทา/ฟ้าอ่อน มุมมนเล็กถึงปานกลาง; ใช้พื้นที่ว่างแยกกลุ่มงาน
- สีน้ำเงินเป็นสี action, link, หัวตาราง, tab ที่เลือก และจุดเน้น ส่วน navy เข้มปรากฏใน navigation
- ตัวอักษร sans-serif; ชื่อ section/บุคคลเด่นกว่า metadata; ป้ายกำกับรองสีเทา **ยังไม่ยืนยันชื่อ font ของแอป**
- ปุ่มหลักพื้นน้ำเงินตัวหนังสือขาว มักเป็นทรง pill พร้อม icon; ปุ่มรองพื้นขาวขอบบาง; More ใช้จุดสามจุด
- มีทั้ง tab แบบเส้นใต้และ segmented control แบบติดกัน; สถานะ selected ไม่ได้ใช้รูปแบบเดียวทุก component
- Avatar ส่วนใหญ่เป็นวงกลม ใช้ทั้งในตาราง การ์ด employee ผู้อนุมัติ และกิจกรรม
- Status ใช้ badge ขนาดเล็กโทนอ่อน เช่น ฟ้า เขียว เหลือง; notification ใช้ badge ส้ม/แดง
- กราฟใช้ชุดสีพาสเทลหลายสี: mint/teal, ฟ้า, coral, เหลือง, ม่วง; มีทั้ง donut, pie, line, bar, gauge และ progress ring
- สีแดงในปุ่มยกเลิก/ลบและลูกศรแนวโน้มมีบริบทต่างกัน ไม่ควรตีความว่าสีแดงทุกจุดเป็น validation error

## 3. รายละเอียดรูปแบบแต่ละหน้าจอ

### 3.1 Home / Employee experience — A01, A13

ภาพแสดงพื้นที่ข้อมูลพนักงานกับพื้นที่กิจกรรมแยกคอลัมน์ การ์ดพนักงานมี avatar ชื่อ ตำแหน่ง เวลาเข้าออก และปุ่มบันทึกเวลา ใต้ลงมามีเพื่อนร่วมงานพร้อม avatar และเวลา และการ์ดยอดสิทธิ์ที่ใช้วงแหวนเปอร์เซ็นต์

พื้นที่กิจกรรมมี tabs สำหรับ feed, reminder และ notification; search อยู่ด้านบน; มีตัวเลือกประเภทโพสต์และช่องเริ่มเขียนโพสต์ ภาพ hero ของ HR Core ยังแสดง calendar card ด้านขวาที่มีวันที่ รายการคำขอ และ status badge แต่เป็นภาพ composite จึงยังไม่ถือว่าเป็นโครง dashboard ที่ครบถ้วน

### 3.2 Employee directory — A02, A11

ใต้ breadcrumb มีแผงสถิติแคบทางซ้าย: headcount donut, turnover line และ turnover gauge ส่วนขวาเป็นแถบ filter สถานะการจ้าง ช่วงวันที่ และตัวเลือกเพิ่มเติม ตามด้วย sort และปุ่มสลับ list view

Employee cards จัดสามคอลัมน์ในภาพ มี avatar ซ้าย ข้อความขวาเรียงชื่อ รหัส ตำแหน่ง และอีเมล บน page heading มีคำขอพนักงานใหม่ ปุ่มเพิ่ม และ More ภาพ A11 เป็น directory เช่นกัน **ไม่ใช่รายละเอียด profile ของบุคคล**

### 3.3 Organization chart — A12

พื้นที่แผนผังขนาดใหญ่บนพื้นขาว มีเครื่องมือด้านบนสำหรับ directory, future, รูปแบบ chart, export และ More กล่องหน่วยงานสีน้ำเงินเชื่อมเส้นลงมายังการ์ดบุคคลที่มี avatar และกลุ่มย่อย มี search ในพื้นที่ chart และชุดเครื่องมือ zoom/fit ทางขวา เห็นโครงสร้างลำดับชั้น แต่ยังไม่ทดสอบ drag, zoom หรือ export

### 3.4 Attendance list และ location map — A03, A15

List view ใช้คอลัมน์สถิติซ้ายกับตารางขวา สถิติมี shift pie, attendance donut และ productivity bars เหนือตารางมี segmented status, employee selector, date range และสถานะเวลา

ตารางมีหัวน้ำเงิน ข้อมูล employee พร้อม avatar วันที่ กะ เวลาเข้าออก badges และหมายเหตุ; มียอดจำนวนรายการซ้ายล่างกับ pagination, page size และช่องไปหน้าทางขวาล่าง

Map view ให้แผนที่กินพื้นที่หลัก และ panel filter ทางขวา มี employee multi-select แบบ chip, date range, radio options และปุ่มใช้ตัวกรอง/ล้างค่า เครื่องมือ zoom อยู่บนแผนที่

### 3.5 Payroll dashboard และ guided process — A04, A14, A19

Dashboard เริ่มด้วยแถบสรุปงวด ช่วงเวลาทำงาน ช่วงเงินเดือน วันทำงาน จำนวนประมวลผล เข้าใหม่ และออก ถัดลงมาเป็น KPI cards เปรียบเทียบค่าปัจจุบันกับเดือนก่อน ใช้เปอร์เซ็นต์และลูกศรสี ตามด้วยกราฟต้นทุนแยกหน่วยงานและแท่งเปรียบเทียบเดือน

Guided process เป็นสองคอลัมน์: ขั้นตอนแนวตั้งพร้อมวงกลมสถานะ/เปอร์เซ็นต์ซ้าย รายละเอียดงานและ progress bar/toggle ด้านขวา มีแถบสรุปความคืบหน้าด้านบน

Component editor มี tabs และ dropdown งวดเงินเดือน; ใช้กล่องรายการสองฝั่งพร้อม search, checkbox, จำนวนรายการ, ลูกศรย้าย และ empty state ทั้งสำหรับ employee และ pay component ปุ่มประมวลผลอยู่ปลายฟอร์ม ภาพมีข้อมูลตัวอย่างต่างประเทศ ไม่ใช่ข้อกำหนดสูตรเงินเดือนหรือภาษีของ hrmic.ai

### 3.6 Benefits / Loan list — A06

แถวควบคุมรวม status segment, join-date range, search, filter, manage columns และปุ่ม grid/list ตารางมี checkbox, employee avatar, ประเภทเงินกู้, สกุลเงิน, ยอด, คงเหลือ, วันที่ และสถานะ

ใช้แถวสลับพื้นอ่อน หัวตารางน้ำเงิน และตัวเลขชิดขวา มี scrollbar แนวนอนกับ action ลบรายการที่เลือกบริเวณล่างของภาพ การเลือกหลายรายการเห็นจาก checkbox ที่ติ๊ก แต่พฤติกรรม bulk action ยังไม่ได้ทดสอบ

### 3.7 Performance form — A08

สรุปพนักงานในแถบบน มี avatar ปุ่มเปลี่ยนพนักงาน ข้อมูลงาน/แบบประเมิน และคะแนนเด่นด้านขวา เนื้อหาเป็นตารางเกณฑ์ประเมิน หัวกลุ่มน้ำเงิน มีค่าน้ำหนัก เป้าหมาย dropdown ผล/คะแนน และ weighted score ใช้เส้นแบ่งอ่อนระหว่างแถว

### 3.8 Recruitment — A07, A21

Dashboard ใช้ donut ขนาดใหญ่พร้อม legend ฝั่งซ้าย KPI ตัวเลขเด่นด้านขวา และแผงจำนวนการจ้างเป็น horizontal bars ด้านล่าง มีตัวเลือก dashboard และงวดเวลา

หน้ารายการคำขอสรรหามี tabs ของคำขอ ผู้สมัคร และ discussion; filter เป็นช่องต่อเนื่องตามข้อมูล พร้อม sort และ view switch ตารางแสดง request, position, วันที่ และผู้รับผิดชอบพร้อม avatar มี pagination ด้านล่าง ภาพ A21 มี placeholder ในข้อมูลบางช่อง ไม่ใช่รายการใช้งานจริงที่ตรวจสอบแล้ว

### 3.9 Training — A16

หัวหน้าเป็น breadcrumb กับปุ่มเพิ่ม/More; แถว filter มี event, course, event type, checkbox จำกัดรายการ และ filter/view switch ตารางหัวน้ำเงินรองรับชื่อคอร์ส ประเภท รหัส หมวด รายละเอียด เงื่อนไขพนักงานใหม่ และต้นทุน โดยส่วนต้นทุนมีหัวตารางซ้อน currency/amount ชื่อคอร์สเป็น link และมี pagination

### 3.10 Request inbox / Employee self-service — A09

มี tabs inbox กับคำขอของตนเอง พร้อม badge จำนวนรายการ ภายในเป็นสามส่วน: ตัวกรองหมวดทางซ้าย รายการคำขอตรงกลาง และรายละเอียดขวา

รายการแสดง avatar ผู้ขอ ประเภท รหัส วันที่ และ badge สถานะ แถวที่เลือกมีพื้นอ่อนและเส้นน้ำเงินด้านซ้าย รายละเอียดมีผู้ขอ actions ข้อมูล label/value และ section ย่อย ภาพแสดง empty state แบบ icon กลางพื้นที่พร้อมข้อความสั้นในตารางที่ไม่มีข้อมูล

### 3.11 Workflow approval / Settings — A05

ด้านหลัง modal เป็น navigation การตั้งค่าแบบกลุ่มย่อย มีแถบค้นหาและรายการที่ขยายได้; หน้าหลักมี alert สีเหลืองและตาราง

Modal ขาวอยู่กลางฉากหลังที่มืดลง มี title กับปุ่มปิด ข้อมูลผู้อนุมัติ กลุ่มขั้นตอนบนพื้นม่วงอ่อน และ diagram ที่ใช้ avatar/เส้นเชื่อม/ป้าย required หรือ shared ยังไม่มีหลักฐานขนาด modal, focus trap, การปิดด้วย keyboard หรือ animation

### 3.12 Helpdesk — A10

สถิติเรียงเป็นคอลัมน์แคบซ้าย มีจำนวน donut gauge และ legend ส่วนหลักมี filter ด้านบนและบอร์ดสามสถานะ หัวคอลัมน์น้ำเงินพร้อมจำนวนและเมนูจุดสามจุด การ์ด ticket มีชื่อเรื่องน้ำเงิน ข้อมูลรอง ผู้เกี่ยวข้อง หมวด และ feedback ไม่ได้ทดสอบว่าลากย้ายการ์ดได้จริง

### 3.13 OKR — A17

การ์ด objective แสดงรหัส/ชื่อ บริบทองค์กร รอบเวลา badge สถานะ และ progress; key results อยู่ด้านล่างพร้อมเส้นลำดับชั้น ผู้รับผิดชอบ ค่าเป้าหมาย/จริง progress bar ป้ายเตือนและปุ่ม check-in ใช้ข้อความเพิ่ม key result/subkey result เป็น link

### 3.14 AI & Analytics — A20

ภาพ feature overview เป็นภาพถ่ายจอที่เห็นแผนภูมิแบบรัศมีหลายหมวด คู่กับคะแนนแบบแถวทางขวา และส่วน AI summary ด้านล่าง ความคมชัด/มุมภาพจำกัด จึงบันทึกเฉพาะ composition นี้

ภาพที่ชื่อ `custom-hr-reports-fit-organization-scaled.webp` เป็นภาพประกอบคนดูรายงาน ไม่ใช่ screenshot ของ report builder จึง **ไม่ใช้เป็นหลักฐานของ UI สร้างรายงาน**

### 3.15 Mobile product — A18

ภาพ composite แสดงหน้า home แบบคอลัมน์เดียว ส่วนบนไล่สีน้ำเงิน มีองค์กร avatar และการบันทึกเวลา ตามด้วย shortcut tiles และ bottom navigation ที่มี action บันทึกเวลาเด่นกลางแถบ

หน้าฟอร์มลามี label เหนือช่อง employee/type/date, remarks, attachment, preview approver และปุ่ม draft/submit ด้านล่าง หน้าสลิปเป็นการ์ดงวดล่าสุดตามด้วยประวัติ ภาพเหล่านี้เป็น SunFish Mobile **ยังไม่พิสูจน์ว่าหน้าเว็บ desktop ย่อลงเป็นรูปแบบเดียวกัน**

### 3.16 รายละเอียดจากภาพเพิ่มเติม 26 รายการ

อ้างอิงลิงก์ชื่อเดียวกันในหัวข้อ “ภาพเพิ่มเติมที่เปิดดูจริง” ของทะเบียนแหล่งอ้างอิง

| หน้าหรือองค์ประกอบ | รายละเอียดที่เห็นเพิ่มเติม |
| --- | --- |
| Payroll processing | tabs แยกงานจ่ายเงิน/ข้อมูล/ปิดงวด; เลือกงวดและใช้ dual-list employee; form อยู่กึ่งกลาง workspace ที่มีพื้นที่ว่างมาก |
| My Payroll Info | การ์ดงวดล่าสุดพื้นอ่อนด้านบน ประวัติเป็นการ์ดเรียงสามช่อง กราฟแท่งซ้อนด้านล่าง; คอลัมน์ขวามีข้อมูล payroll, วงแหวนวันถึง payday และรายการประมาณการ |
| Statutory report | tabs, dropdown รอบรายงาน/ชื่อรายงาน, เดือนปี, dual-list งวด และปุ่มดาวน์โหลด; เป็นภาพ composite มีธงบังบางส่วน ไม่ใช่หน้าเอกสารที่พิมพ์แล้ว |
| Employee shift | employee summary อยู่เหนือ table; ภาพขยายแสดง dropdown กลุ่มกะ ช่วงวันที่ และแถบวันรายสัปดาห์ โดยวันหยุดใช้พื้นแดงอ่อน |
| Advanced Scheduling image | ภาพที่เผยแพร่ชื่อนี้แสดง attendance list ลักษณะเดียวกับ A15; ไม่ถือเป็นหลักฐานของ roster editor |
| Timesheet request | แถบ employee/time summary กับตัวเลือกวันรายสัปดาห์ วันที่เลือกเป็นวงกลมน้ำเงิน; มี draft badge, template toggle, auto-sort/reset และรายการช่วงเวลา แต่ภาพตัดส่วนล่าง |
| Project detail | summary ของช่วงเวลา งบ ผู้จัดการ avatar group และ progress bar; sidebar สมาชิก; board งานสามสถานะพร้อม tag, priority, ผู้รับผิดชอบและ due date |
| Talent overview | ภาพถ่ายจอแบบประเมินบน notebook; ใช้ยืนยัน composition เท่านั้น ไม่อ่านทุก field จากภาพเอียงขนาดเล็ก |
| Development plan | employee context และเมนูย่อยซ้าย; ตารางแผนพัฒนาด้านบน; matrix สี 3 × 3 พร้อม avatar ด้านล่าง; ภาพตัวอย่างมีข้อความวันที่ผิดปกติ ไม่ใช่ requirement |
| Succession planning | filter column กับ employee comparison cards เชื่อมเป็นลำดับชั้น; readiness/performance/match และคะแนน; navigation ภาพนี้มีหมวดเพิ่มและ icon แบบ placeholder จึงไม่ใช้เป็นมาตรฐาน icon |
| Reimbursement balance | tabs, ประเภทสิทธิ์, employee multi-select และ view switch; การ์ดยอดสิทธิ์สามคอลัมน์พร้อม avatar, validity, status, ยอดรวม/ใช้แล้ว/คงเหลือ และข้อความกรณีไม่มียอด |
| Travel/on-duty request | inbox แบบรายการซ้าย–รายละเอียดขวา; ปุ่ม revise สีขาว reject สีแดง approve สีเขียว; รายละเอียด label/value และตารางกะ |
| Onboarding | welcome banner โทน teal มี avatar จำนวนวันและ progress ring; checklist แยกขั้นเลขวงกลม; คอลัมน์ขวาเป็น colleagues และสถานที่พร้อมภาพ/แผนที่ |
| Applicant interaction | รายชื่อผู้สมัครซ้าย conversation กลาง และ profile/match summary ขวา; bubble รับส่งพื้นต่างกัน มีเวลาและ indicator |
| Public careers | shell ต่างจาก portal: navbar แนวนอน banner สีเด่น search panel ลอยซ้อนขอบ banner และ job cards พร้อม metadata/match; สี banner ไม่ใช่ global app token |
| AI resume image | เห็นฟอร์มตั้งค่า recruitment แบบเมนูย่อยซ้ายและ numbered selection steps แต่มี illustration หุ่นยนต์บังกลางภาพ; ไม่ยืนยันรูปแบบ resume-reader result |
| E-learning | หัว course/event, avatar group และ tabs; chapter accordion พื้นอ่อน, video/test icons และ passed/progress indicators |
| AI course suggestion | modal กลางหน้ามี required fields, dropdown, helper text, credit indicator และปุ่ม generate; form ด้านหลังมีเมนูย่อยของ course |
| OKR designer | ภาพหลายขั้นของ wizard: step indicator ด้านบน, option cards, ปุ่ม next และขั้นสรุปก่อนส่งอนุมัติ; ไม่มีหลักฐานครบทุก transition |
| OKR alignment | ภาพ composite ของ node diagram, details modal พร้อม progress และ organization view; เชื่อม objective/employee เป็น hierarchy |
| Document management | tabs เอกสารส่วนตัว/ระบบ; folder tree ซ้าย file table ขวา; search แยก folder/file; format icons, size, modified date, checkbox, row menu และปุ่มเพิ่ม |
| Digital signature | modal เลือก saved/draw/upload พร้อมพื้นที่ลายเซ็น ปุ่มยกเลิก/submit; พื้นหลังเป็น inbox กับ document preview และ approval summary |
| AI executive report | filter sidebar เลือกช่วงเวลาเปรียบเทียบและหมวดด้วย checkbox; report canvas ขวารวม title, charts และข้อความวิเคราะห์; มี save, generate PDF และ rewrite action; ยังไม่เห็นไฟล์ PDF ที่สร้างจริง |
| Mobile attendance | composite แสดง home → leave form → inbox และ map confirmation → face capture; control ที่เห็นคือ confirm, retake และ save ไม่ได้ใช้งานกล้องหรือส่งคำขอจริง |
| Mobile payroll | จำนวนเงินถูก mask พร้อม eye icon; latest card, salary history และรายการ tax forms ที่มี download icon |
| Mobile directory/profile | profile menu, employee summary พร้อม metric rings/career history, module tiles, directory tabs และ employee picker แบบ bottom sheet พร้อม search |

## 4. เว็บไซต์ประชาสัมพันธ์: ค่าที่วัดได้

อ้างอิง [หน้าแรก](https://dataon.com/en-th/) วัดใน desktop state เท่านั้น ไม่ควรนำไปตั้งค่าแอปโดยถือว่าเป็นค่าของแอปจริง

| รายการ | ค่า computed style / การสังเกต |
| --- | --- |
| Font stack ที่ประกาศ | `poppins, inter, system-ui, sans-serif` (ยังไม่ตรวจ actual rendered font) |
| Primary | `#395EBC` |
| Heading / body | `#0D0E12` / `#323232` |
| Tint / border / surface | `#EBEFF8` / `#E0E0E0` / `#FFFFFF` |
| Hero H1 | 48px; weight 600; line-height 57.6px |
| Section H2 | 36px; weight 500; line-height 46.8px |
| Feature H3 | 18px; weight 500; line-height 25.2px |
| Body | 16px; weight 400; line-height 25.6px |
| Navigation/contact | ตัวอย่างที่วัด 14px; weight 500; line-height 22.4px |
| CTA | 16px/500; padding 7px 20px; radius 7px |
| Container | 1440px ใน viewport นี้; padding ข้าง 128px; เนื้อหาภายในประมาณ 1184px |
| Hero | สองคอลัมน์; gap 31px; detail gap 11px |
| Feature card | พื้นขาว border บาง; radius 7px; detail padding 21px; ไม่มี shadow ในตัวอย่างที่วัด |
| Role tab | radius 50px; padding 7px 24px; gap 11px |
| Selected role | gradient 90deg จาก `#395EBC` ถึง `#829AD5`; ตัวอักษรขาว |
| Header | fixed; ภาพหลัง scroll แสดงแถบเมนูหลักคงอยู่ |
| Role tab list | sticky; พื้น `#EBEFF8` |

### โครงหน้าและ interaction ที่ตรวจจริง

หน้าแรกประกอบด้วย header สองชั้น, hero ข้อความ/ภาพ, แถบลูกค้า, role tabs กับ feature cards, จุดเด่น, รางวัล, ข้อมูลองค์กร, customer stories, resources, CTA และ footer หลายคอลัมน์

Products เปิด mega-menu ที่มีหมวดซ้ายและรายการโมดูลสองคอลัมน์ขวา; รายการที่เลือกมีพื้นอ่อน/เส้นน้ำเงิน ทดลองเลือก role HR แล้วเห็นเนื้อหา cards เปลี่ยนตามจริง เว็บไซต์มี carousel รางวัลที่เปลี่ยนสไลด์ระหว่างตรวจ

หน้า module ที่อ่านมีโครง hero → highlights/features → ประโยชน์/ข้อมูลประกอบ → social proof/CTA โดยองค์ประกอบและจำนวน section แตกต่างกัน ไม่ใช่ template ที่เหมือนกันทุกหน้า

### Responsive ที่ยังยืนยันไม่ได้

ทดลองขอ viewport 390 × 844 แต่หน้าเป้าหมายยังรายงาน `innerWidth = 1536` จึงไม่นับว่าได้ทดสอบ mobile breakpoint สำเร็จ และได้ reset viewport override แล้ว ไม่ระบุค่าขนาด mobile font, breakpoint, menu หรือการเรียงคอลัมน์เป็นข้อเท็จจริง

## 5. จุดอ้างอิงภายใน hrmic.ai สำหรับงานอนาคต

ตรวจโครงสร้างไฟล์แบบอ่านอย่างเดียว ไม่ใช่ full UI audit และยังไม่ได้เปิด/เปรียบเทียบหน้าจอ hrmic.ai ที่รันจริง

| พื้นที่ในโปรเจ็ค | รูปแบบอ้างอิงที่เกี่ยวข้อง |
| --- | --- |
| `components/layouts/PortalLayoutClient.tsx` | app shell, header, navigation |
| `components/layouts/SubmenuPanel.tsx` | เมนูย่อย/การตั้งค่า |
| `components/layouts/UserDropdown.tsx` | บริบทผู้ใช้/องค์กร |
| `app/globals.css` | tokens และรูปแบบร่วม เมื่อมีคำสั่ง implementation |
| `app/(portal)/dashboard/` | card composition, KPI, feed, calendar |
| `app/(portal)/organization/`, `employees/` | employee directory และ organization chart |
| `app/(portal)/attendance/` | filter/table/statistics/map |
| `app/(portal)/payroll/`, `salary/` | payroll dashboard, period context, guided process |
| `app/(portal)/recruitment/`, `performance/`, `training/` | domain list/form/dashboard patterns |
| `app/(portal)/workflows/`, `communication/` | request inbox, approvals, feed |
| `app/(portal)/reports/`, `settings/`, `profile/` | report/settings/detail patterns; หลักฐานบางส่วนยังไม่ครบ |
| `app/(public)/`, `components/auth/` | เว็บไซต์ประชาสัมพันธ์; login/register ของ SunFish ยังไม่เห็น |

พบ working tree มีงานแก้ไขเดิมจำนวนมากก่อนเริ่มศึกษา ห้ามถือว่างานเหล่านั้นเป็นผลของการศึกษานี้ และไม่ควร overwrite เมื่อเริ่มปรับ UI ภายหลัง บันทึกรอบนี้เพิ่มเฉพาะเอกสารศึกษา 2 ไฟล์

## 6. รายละเอียดที่ยังต้องมีหลักฐานเพิ่มก่อนอ้างว่าครบทุกหน้า/ทุกสถานะ

- แอปหลังเข้าสู่ระบบที่ใช้ release/theme เป้าหมายจริง และเมนูตาม role
- Home เต็มหน้า, employee profile/edit/create, login, register, reset password
- actual app fonts, exact colors, spacing, dimensions, shadows และ icon library
- hover, focus, pressed, disabled, loading, skeleton, error, toast และ validation
- behavior ของ dropdown, date picker, column manager, pagination, sorting และ bulk actions
- keyboard navigation, focus management, screen-reader labels และ accessibility
- sticky table header/columns, scroll containers และการจดจำตัวกรอง
- responsive desktop/tablet/mobile ของเว็บ และ dark mode ถ้ามี
- modal/drawer ทุกชนิด รวม confirmation และ destructive actions
- export/print/report/payslip layout และหน้าที่ไม่มี screenshot สาธารณะ
- ภาษาไทย ฟอนต์ไทย ข้อความยาว รูปแบบวันที่ ตัวเลข และสกุลเงินในบริบทไทย

การศึกษาสาธารณะครั้งนี้เพียงพอสำหรับระบุแนวทางและรูปแบบที่เห็นซ้ำ แต่ **ยังไม่ใช่ specification ที่พิสูจน์ครบทุกหน้าจอและทุก interaction ของ SunFish** ต้องไม่อ้างว่าได้จำลองระบบครบหรือจดจำส่วนที่ไม่เคยเข้าถึง

## 7. ข้อตกลงสำหรับการทำงานต่อ

1. ใช้ไฟล์นี้และทะเบียนแหล่งอ้างอิงเป็นฐานศึกษาต่อ; เปิดภาพที่เกี่ยวข้องซ้ำก่อนตัดสินรายละเอียด
2. รอคำสั่งให้เริ่มแก้ไขจากผู้ใช้ก่อนแตะ implementation; บันทึกนี้ไม่ใช่ permission ให้เปลี่ยนระบบ
3. เมื่อได้รับคำสั่งแล้ว ค่อยแยกสิ่งที่พิสูจน์ได้ออกจากข้อเสนอสำหรับ hrmic.ai และเติมหลักฐานในส่วนที่ขาด
4. ก่อนเขียนโค้ด Next.js ต้องอ่านคู่มือที่เกี่ยวข้องใน `node_modules/next/dist/docs/` ตาม `AGENTS.md`
5. ตัวอย่างชื่อบริษัท บุคคล ยอดเงิน โลโก้ และข้อความการตลาดในภาพเป็นบริบทของ reference ไม่ใช่ข้อมูลหรือเนื้อหาที่อนุมัติให้นำเข้า hrmic.ai

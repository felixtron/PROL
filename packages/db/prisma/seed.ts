import { PrismaClient } from "@prisma/client";
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);
const prisma = new PrismaClient();

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Hash a password using the same scrypt config as Better Auth */
async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const key = (await scryptAsync(
    password.normalize("NFKC"),
    salt,
    64,
    { N: 16384, r: 16, p: 1, maxmem: 128 * 16384 * 16 * 2 }
  )) as Buffer;
  return `${salt}:${key.toString("hex")}`;
}

/** Returns a Date N days in the past from now. */
function daysAgo(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d;
}

/** Random integer between min and max (inclusive). */
function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// ─────────────────────────────────────────────────────────────────────────────
// Course content definitions
// ─────────────────────────────────────────────────────────────────────────────

interface LessonDef {
  title: string;
  duration: number; // seconds
}

interface ModuleDef {
  title: string;
  description: string;
  lessons: LessonDef[];
}

const marketingModules: ModuleDef[] = [
  {
    title: "Módulo 1: Fundamentos del Marketing Digital",
    description:
      "Conoce los pilares del marketing digital y cómo aplicarlos en el mercado mexicano.",
    lessons: [
      { title: "Introducción al marketing digital en Latinoamérica", duration: 420 },
      { title: "El embudo de ventas digital", duration: 540 },
      { title: "Definiendo tu buyer persona", duration: 480 },
      { title: "Análisis de la competencia online", duration: 390 },
      { title: "Ecosistema de plataformas digitales", duration: 510 },
      { title: "Métricas clave: KPIs que importan", duration: 600 },
      { title: "Presupuesto para campañas digitales", duration: 450 },
      { title: "Herramientas esenciales del marketer", duration: 360 },
    ],
  },
  {
    title: "Módulo 2: Publicidad en Redes Sociales",
    description:
      "Domina Facebook Ads, Instagram Ads y TikTok Ads para el mercado hispano.",
    lessons: [
      { title: "Estructura de campañas en Meta Ads", duration: 720 },
      { title: "Segmentación avanzada para México", duration: 660 },
      { title: "Creativos que convierten: diseño de anuncios", duration: 540 },
      { title: "Retargeting y audiencias personalizadas", duration: 480 },
      { title: "TikTok Ads: oportunidades en LATAM", duration: 510 },
      { title: "Optimización de presupuesto (CBO vs ABO)", duration: 450 },
      { title: "A/B Testing en campañas publicitarias", duration: 390 },
      { title: "Reportes y análisis de rendimiento", duration: 600 },
    ],
  },
  {
    title: "Módulo 3: SEO y Marketing de Contenidos",
    description:
      "Posiciona tu marca en Google y crea contenido que atraiga clientes orgánicamente.",
    lessons: [
      { title: "Fundamentos de SEO on-page", duration: 540 },
      { title: "Investigación de palabras clave en español", duration: 660 },
      { title: "SEO técnico: velocidad y Core Web Vitals", duration: 720 },
      { title: "Estrategia de contenidos para blogs", duration: 480 },
      { title: "Link building ético y efectivo", duration: 510 },
      { title: "SEO local para negocios en México", duration: 450 },
      { title: "Google Analytics 4: configuración y reportes", duration: 600 },
      { title: "Automatización del marketing de contenidos", duration: 900 },
    ],
  },
];

const copywritingModules: ModuleDef[] = [
  {
    title: "Módulo 1: Psicología de la Persuasión",
    description:
      "Entiende cómo piensan tus clientes y qué los motiva a comprar.",
    lessons: [
      { title: "Los 6 principios de persuasión de Cialdini", duration: 540 },
      { title: "Gatillos mentales aplicados a textos de venta", duration: 480 },
      { title: "El poder de las historias: storytelling comercial", duration: 600 },
      { title: "Dolor vs placer: frameworks de motivación", duration: 420 },
      { title: "Investigación de mercado para copywriters", duration: 510 },
      { title: "Voz de marca y tono de comunicación", duration: 450 },
    ],
  },
  {
    title: "Módulo 2: Copywriting para Páginas de Venta",
    description:
      "Escribe páginas que conviertan visitantes en compradores.",
    lessons: [
      { title: "Anatomía de una página de ventas efectiva", duration: 720 },
      { title: "Headlines magnéticos: fórmulas probadas", duration: 540 },
      { title: "Bullets que venden: cómo listar beneficios", duration: 480 },
      { title: "Testimonios y prueba social persuasiva", duration: 390 },
      { title: "Llamados a la acción irresistibles (CTAs)", duration: 450 },
      { title: "Objeciones comunes y cómo resolverlas en texto", duration: 600 },
    ],
  },
  {
    title: "Módulo 3: Email Marketing y Secuencias",
    description:
      "Crea secuencias de emails que nutren y convierten prospectos.",
    lessons: [
      { title: "Estructura de una secuencia de bienvenida", duration: 540 },
      { title: "Asuntos de email que aumentan apertura", duration: 420 },
      { title: "Emails de venta: la secuencia de lanzamiento", duration: 660 },
      { title: "Segmentación y personalización en email", duration: 480 },
      { title: "Carritos abandonados: secuencias de recuperación", duration: 510 },
      { title: "Métricas de email: qué medir y cómo mejorar", duration: 450 },
    ],
  },
];

const uxuiModules: ModuleDef[] = [
  {
    title: "Módulo 1: Fundamentos de UX",
    description:
      "Aprende los principios de experiencia de usuario desde cero.",
    lessons: [
      { title: "¿Qué es UX y por qué importa?", duration: 420 },
      { title: "Investigación de usuarios: entrevistas y encuestas", duration: 540 },
      { title: "Mapas de empatía y customer journey", duration: 480 },
      { title: "Arquitectura de información básica", duration: 510 },
    ],
  },
  {
    title: "Módulo 2: Introducción al UI Design",
    description:
      "Diseña interfaces atractivas y funcionales con herramientas modernas.",
    lessons: [
      { title: "Principios de diseño visual para interfaces", duration: 600 },
      { title: "Tipografía y color en diseño digital", duration: 540 },
      { title: "Componentes UI: botones, forms y cards", duration: 480 },
      { title: "Prototipado en Figma: primeros pasos", duration: 720 },
    ],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Main seed function
// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log("🌱 Starting PROL seed…\n");

  // ── 0. Clean existing data (respect FK order) ──────────────────────────
  console.log("🗑️  Cleaning existing data…");

  await prisma.$transaction([
    prisma.aIGenerationJob.deleteMany(),
    prisma.interactiveStopResponse.deleteMany(),
    prisma.interactiveStop.deleteMany(),
    prisma.quizAttempt.deleteMany(),
    prisma.quiz.deleteMany(),
    prisma.lessonProgress.deleteMany(),
    prisma.workshopAttendance.deleteMany(),
    prisma.workshopBooking.deleteMany(),
    prisma.workshop.deleteMany(),
    prisma.certificate.deleteMany(),
    prisma.coursePayment.deleteMany(),
    prisma.enrollment.deleteMany(),
    prisma.lesson.deleteMany(),
    prisma.module.deleteMany(),
    prisma.notification.deleteMany(),
    prisma.auditLog.deleteMany(),
    prisma.course.deleteMany(),
    prisma.session.deleteMany(),
    prisma.account.deleteMany(),
    prisma.verification.deleteMany(),
    prisma.user.deleteMany(),
    prisma.tenant.deleteMany(),
  ]);

  console.log("   ✅ All tables cleared.\n");

  // ── 1. Tenant ──────────────────────────────────────────────────────────
  console.log("🏫 Creating tenant…");

  const tenant = await prisma.tenant.create({
    data: {
      name: "Academia Digital MX",
      slug: "academia-digital",
      status: "TRIAL",
      trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days from now
      revenueShareRate: 0.30,
      workshopsEnabled: true,
      aiEnabled: true,
      primaryColor: "#6366f1",
      accentColor: "#f59e0b",
      contactEmail: "contacto@academiadigitalmx.com",
      phone: "+52 55 1234 5678",
      socialLinks: {
        facebook: "https://facebook.com/academiadigitalmx",
        instagram: "https://instagram.com/academiadigitalmx",
        tiktok: "https://tiktok.com/@academiadigitalmx",
      },
    },
  });

  console.log(`   ✅ Tenant: ${tenant.name} (${tenant.id})\n`);

  // ── 2. Users ───────────────────────────────────────────────────────────
  console.log("👤 Creating users…");

  const professor = await prisma.user.create({
    data: {
      email: "maria.garcia@academiadigitalmx.com",
      emailVerified: true,
      name: "María García",
      role: "PROFESSOR",
      tenantId: tenant.id,
      onboardingCompleted: true,
      lastLoginAt: daysAgo(1),
    },
  });

  const student1 = await prisma.user.create({
    data: {
      email: "carlos.mendoza@gmail.com",
      emailVerified: true,
      name: "Carlos Mendoza",
      role: "STUDENT",
      tenantId: tenant.id,
      onboardingCompleted: true,
      lastLoginAt: daysAgo(2),
    },
  });

  const student2 = await prisma.user.create({
    data: {
      email: "ana.rodriguez@outlook.com",
      emailVerified: true,
      name: "Ana Rodríguez",
      role: "STUDENT",
      tenantId: tenant.id,
      onboardingCompleted: true,
      lastLoginAt: daysAgo(0),
    },
  });

  const admin = await prisma.user.create({
    data: {
      email: "admin@prol.prosuite.pro",
      emailVerified: true,
      name: "Admin PROL",
      role: "ADMIN",
      tenantId: tenant.id,
      onboardingCompleted: true,
      lastLoginAt: daysAgo(0),
    },
  });

  const superAdmin = await prisma.user.create({
    data: {
      email: "super@prol.prosuite.pro",
      emailVerified: true,
      name: "Super Admin",
      role: "SUPER_ADMIN",
      onboardingCompleted: true,
      lastLoginAt: daysAgo(0),
    },
  });

  // Create Better Auth credential accounts (so users can log in with email+password)
  const PASSWORD = "password123"; // Default password for all seed users
  const hashedPw = await hashPassword(PASSWORD);

  for (const user of [professor, student1, student2, admin, superAdmin]) {
    await prisma.account.create({
      data: {
        id: `account_${user.id}`,
        userId: user.id,
        accountId: user.id,
        providerId: "credential",
        password: hashedPw,
      },
    });
  }

  console.log(`   ✅ Professor: ${professor.name} (${professor.email})`);
  console.log(`   ✅ Student 1: ${student1.name} (${student1.email})`);
  console.log(`   ✅ Student 2: ${student2.name} (${student2.email})`);
  console.log(`   ✅ Admin: ${admin.name} (${admin.email})`);
  console.log(`   ✅ Super Admin: ${superAdmin.name} (${superAdmin.email})`);
  console.log(`   🔑 Password for all users: ${PASSWORD}\n`);

  // ── 3. Courses ─────────────────────────────────────────────────────────
  console.log("📚 Creating courses…");

  const marketingCourse = await prisma.course.create({
    data: {
      tenantId: tenant.id,
      professorId: professor.id,
      title: "Marketing Digital Avanzado",
      slug: "marketing-digital-avanzado",
      description:
        "Domina las estrategias de marketing digital más efectivas para el mercado mexicano. Aprende a crear campañas publicitarias rentables, optimizar tu presencia en redes sociales y posicionar tu marca en Google.",
      priceInCents: 149900,
      currency: "MXN",
      status: "PUBLISHED",
      publishedAt: daysAgo(90),
      category: "Marketing",
      tags: ["marketing digital", "redes sociales", "SEO", "publicidad", "meta ads"],
      totalLessons: 24,
      totalDurationMinutes: Math.round(
        marketingModules.reduce(
          (acc, m) =>
            acc + m.lessons.reduce((la, l) => la + l.duration, 0),
          0,
        ) / 60,
      ),
    },
  });

  const copywritingCourse = await prisma.course.create({
    data: {
      tenantId: tenant.id,
      professorId: professor.id,
      title: "Copywriting para Ventas",
      slug: "copywriting-para-ventas",
      description:
        "Aprende a escribir textos que venden. Desde páginas de venta hasta emails de conversión, domina el arte de persuadir con palabras en el mercado hispanohablante.",
      priceInCents: 99900,
      currency: "MXN",
      status: "PUBLISHED",
      publishedAt: daysAgo(60),
      category: "Escritura",
      tags: ["copywriting", "ventas", "email marketing", "persuasión", "páginas de venta"],
      totalLessons: 18,
      totalDurationMinutes: Math.round(
        copywritingModules.reduce(
          (acc, m) =>
            acc + m.lessons.reduce((la, l) => la + l.duration, 0),
          0,
        ) / 60,
      ),
    },
  });

  const uxuiCourse = await prisma.course.create({
    data: {
      tenantId: tenant.id,
      professorId: professor.id,
      title: "Diseño UX/UI para Principiantes",
      slug: "diseno-ux-ui-principiantes",
      description:
        "Inicia tu carrera en diseño UX/UI. Aprende investigación de usuarios, diseño de interfaces y prototipado con herramientas profesionales.",
      priceInCents: 79900,
      currency: "MXN",
      status: "DRAFT",
      category: "Diseño",
      tags: ["UX", "UI", "diseño", "Figma", "experiencia de usuario"],
      totalLessons: 8,
      totalDurationMinutes: Math.round(
        uxuiModules.reduce(
          (acc, m) =>
            acc + m.lessons.reduce((la, l) => la + l.duration, 0),
          0,
        ) / 60,
      ),
    },
  });

  console.log(`   ✅ Course 1: ${marketingCourse.title} (${marketingCourse.id})`);
  console.log(`   ✅ Course 2: ${copywritingCourse.title} (${copywritingCourse.id})`);
  console.log(`   ✅ Course 3: ${uxuiCourse.title} (${uxuiCourse.id})\n`);

  // ── 4. Modules & Lessons ───────────────────────────────────────────────
  console.log("📖 Creating modules and lessons…");

  /**
   * Create all modules + lessons for a course, returning a flat array of created lessons.
   */
  async function createModulesAndLessons(
    courseId: string,
    moduleDefs: ModuleDef[],
    published: boolean,
  ) {
    const allLessons: { id: string; title: string }[] = [];

    for (let mi = 0; mi < moduleDefs.length; mi++) {
      const mDef = moduleDefs[mi]!;

      const mod = await prisma.module.create({
        data: {
          courseId,
          title: mDef.title,
          description: mDef.description,
          position: mi + 1,
          isPublished: published,
        },
      });

      for (let li = 0; li < mDef.lessons.length; li++) {
        const lDef = mDef.lessons[li]!;

        const lesson = await prisma.lesson.create({
          data: {
            moduleId: mod.id,
            title: lDef.title,
            position: li + 1,
            type: "VIDEO",
            videoUrl: `https://stream.mux.com/seed-${courseId}-m${mi + 1}-l${li + 1}.m3u8`,
            videoDurationSeconds: lDef.duration,
            isPublished: published,
            isFree: mi === 0 && li === 0, // First lesson of each course is free
          },
        });

        allLessons.push({ id: lesson.id, title: lesson.title });
      }
    }

    return allLessons;
  }

  const marketingLessons = await createModulesAndLessons(
    marketingCourse.id,
    marketingModules,
    true,
  );
  console.log(`   ✅ Marketing Digital: ${marketingLessons.length} lessons in 3 modules`);

  const copywritingLessons = await createModulesAndLessons(
    copywritingCourse.id,
    copywritingModules,
    true,
  );
  console.log(`   ✅ Copywriting: ${copywritingLessons.length} lessons in 3 modules`);

  const uxuiLessons = await createModulesAndLessons(
    uxuiCourse.id,
    uxuiModules,
    false, // DRAFT course — lessons not published
  );
  console.log(`   ✅ UX/UI: ${uxuiLessons.length} lessons in 2 modules\n`);

  // ── 5. Enrollments ─────────────────────────────────────────────────────
  console.log("🎓 Creating enrollments…");

  const enrollCarlosMarketing = await prisma.enrollment.create({
    data: {
      studentId: student1.id,
      courseId: marketingCourse.id,
      tenantId: tenant.id,
      status: "ACTIVE",
      progress: 0.65,
      enrolledAt: daysAgo(75),
    },
  });

  const enrollCarlosCopywriting = await prisma.enrollment.create({
    data: {
      studentId: student1.id,
      courseId: copywritingCourse.id,
      tenantId: tenant.id,
      status: "ACTIVE",
      progress: 0.42,
      enrolledAt: daysAgo(45),
    },
  });

  const enrollAnaMarketing = await prisma.enrollment.create({
    data: {
      studentId: student2.id,
      courseId: marketingCourse.id,
      tenantId: tenant.id,
      status: "COMPLETED",
      progress: 1.0,
      enrolledAt: daysAgo(85),
      completedAt: daysAgo(10),
    },
  });

  const enrollAnaCopywriting = await prisma.enrollment.create({
    data: {
      studentId: student2.id,
      courseId: copywritingCourse.id,
      tenantId: tenant.id,
      status: "ACTIVE",
      progress: 0.15,
      enrolledAt: daysAgo(20),
    },
  });

  console.log(`   ✅ Carlos → Marketing (progress 65%)`);
  console.log(`   ✅ Carlos → Copywriting (progress 42%)`);
  console.log(`   ✅ Ana → Marketing (progress 100%, COMPLETED)`);
  console.log(`   ✅ Ana → Copywriting (progress 15%)\n`);

  // ── 6. Lesson Progress ─────────────────────────────────────────────────
  console.log("📊 Creating lesson progress records…");

  /**
   * Create lesson progress for a given enrollment.
   * completedCount = number of COMPLETED lessons (from the start).
   * hasInProgress  = whether the next lesson after completed ones is IN_PROGRESS.
   */
  async function createLessonProgress(
    enrollmentId: string,
    lessons: { id: string; title: string }[],
    completedCount: number,
    hasInProgress: boolean,
  ) {
    let created = 0;

    for (let i = 0; i < completedCount; i++) {
      await prisma.lessonProgress.create({
        data: {
          enrollmentId,
          lessonId: lessons[i]!.id,
          status: "COMPLETED",
          videoPositionSeconds: 0, // fully watched
          completedAt: daysAgo(completedCount - i + randInt(1, 5)),
        },
      });
      created++;
    }

    if (hasInProgress && completedCount < lessons.length) {
      await prisma.lessonProgress.create({
        data: {
          enrollmentId,
          lessonId: lessons[completedCount]!.id,
          status: "IN_PROGRESS",
          videoPositionSeconds: randInt(60, 300),
        },
      });
      created++;
    }

    return created;
  }

  // Carlos — Marketing: first 15 COMPLETED, lesson 16 IN_PROGRESS
  const carlosMarketingProgress = await createLessonProgress(
    enrollCarlosMarketing.id,
    marketingLessons,
    15,
    true,
  );
  console.log(`   ✅ Carlos × Marketing: ${carlosMarketingProgress} progress records`);

  // Carlos — Copywriting: first 7 COMPLETED, lesson 8 IN_PROGRESS
  const carlosCopyProgress = await createLessonProgress(
    enrollCarlosCopywriting.id,
    copywritingLessons,
    7,
    true,
  );
  console.log(`   ✅ Carlos × Copywriting: ${carlosCopyProgress} progress records`);

  // Ana — Marketing: all 24 COMPLETED
  const anaMarketingProgress = await createLessonProgress(
    enrollAnaMarketing.id,
    marketingLessons,
    24,
    false,
  );
  console.log(`   ✅ Ana × Marketing: ${anaMarketingProgress} progress records (all completed)`);

  // Ana — Copywriting: first 2 COMPLETED, lesson 3 IN_PROGRESS
  const anaCopyProgress = await createLessonProgress(
    enrollAnaCopywriting.id,
    copywritingLessons,
    2,
    true,
  );
  console.log(`   ✅ Ana × Copywriting: ${anaCopyProgress} progress records\n`);

  // ── 7. Payments ────────────────────────────────────────────────────────
  console.log("💳 Creating payments…");

  // Revenue share: 30% PROL fee. Stripe fee estimated ~3.6% + $3 MXN.
  function computePayment(amountCents: number) {
    const revenueShareRate = 0.30;
    const prolFee = Math.round(amountCents * revenueShareRate);
    const stripeFee = Math.round(amountCents * 0.036 + 300); // ~3.6% + $3 MXN
    const creatorReceives = amountCents - prolFee - stripeFee;
    return { revenueShareRate, prolFee, stripeFee, creatorReceives };
  }

  const paymentDefs = [
    {
      studentId: student1.id,
      courseId: marketingCourse.id,
      amount: 149900,
      stripePaymentId: "pi_seed_1",
      paidAt: daysAgo(75),
    },
    {
      studentId: student1.id,
      courseId: copywritingCourse.id,
      amount: 99900,
      stripePaymentId: "pi_seed_2",
      paidAt: daysAgo(45),
    },
    {
      studentId: student2.id,
      courseId: marketingCourse.id,
      amount: 149900,
      stripePaymentId: "pi_seed_3",
      paidAt: daysAgo(85),
    },
    {
      studentId: student2.id,
      courseId: copywritingCourse.id,
      amount: 99900,
      stripePaymentId: "pi_seed_4",
      paidAt: daysAgo(20),
    },
  ];

  for (const pDef of paymentDefs) {
    const fees = computePayment(pDef.amount);

    await prisma.coursePayment.create({
      data: {
        tenantId: tenant.id,
        studentId: pDef.studentId,
        courseId: pDef.courseId,
        amount: pDef.amount,
        currency: "MXN",
        revenueShareRate: fees.revenueShareRate,
        prolFee: fees.prolFee,
        creatorReceives: fees.creatorReceives,
        stripeFee: fees.stripeFee,
        stripePaymentId: pDef.stripePaymentId,
        paymentMethod: "CARD",
        status: "COMPLETED",
        paidAt: pDef.paidAt,
      },
    });

    console.log(
      `   ✅ Payment ${pDef.stripePaymentId}: $${(pDef.amount / 100).toFixed(2)} MXN → creator receives $${(fees.creatorReceives / 100).toFixed(2)} MXN`,
    );
  }

  console.log();

  // ── 8. Certificate ─────────────────────────────────────────────────────
  console.log("🏆 Creating certificate…");

  const certHash = "cert_prol_mktg_ana_rodriguez_2025";
  const certFolio = "PROL-2025-0001";
  const { createHash } = await import("node:crypto");
  const certSha256 = createHash("sha256")
    .update(`${certFolio}|Ana Rodríguez|Marketing Digital Avanzado|María García|Academia Digital MX|${daysAgo(10).toISOString()}`)
    .digest("hex");

  const certificate = await prisma.certificate.create({
    data: {
      enrollmentId: enrollAnaMarketing.id,
      tenantId: tenant.id,
      studentName: "Ana Rodríguez",
      courseName: "Marketing Digital Avanzado",
      professorName: "María García",
      folio: certFolio,
      hash: certHash,
      sha256: certSha256,
      status: "ACTIVE",
      finalExamScore: 95,
      issuedAt: daysAgo(10),
      pdfUrl: "https://storage.prol.prosuite.pro/certificates/cert_prol_mktg_ana_rodriguez_2025.pdf",
      metadata: {
        completionDate: daysAgo(10).toISOString(),
        totalHours: Math.round(
          marketingModules.reduce(
            (acc, m) => acc + m.lessons.reduce((la, l) => la + l.duration, 0),
            0,
          ) / 3600,
        ),
        finalGrade: 95,
      },
    },
  });

  // Initialize counter so the next folio continues from 0002
  await prisma.certificateCounter.upsert({
    where: { tenantId_year: { tenantId: tenant.id, year: 2025 } },
    create: { tenantId: tenant.id, year: 2025, lastSeq: 1 },
    update: { lastSeq: 1 },
  });

  console.log(`   ✅ Certificate for Ana: ${certificate.folio}\n`);

  // ── 9. Notifications ───────────────────────────────────────────────────
  console.log("🔔 Creating notifications…");

  await prisma.notification.create({
    data: {
      userId: professor.id,
      tenantId: tenant.id,
      type: "ENROLLMENT",
      title: "Nuevo estudiante inscrito",
      message:
        "Carlos Mendoza se ha inscrito en tu curso \"Marketing Digital Avanzado\". ¡Ya tienes 2 estudiantes!",
      link: `/dashboard/courses/${marketingCourse.slug}/students`,
      isRead: true,
      createdAt: daysAgo(75),
    },
  });

  await prisma.notification.create({
    data: {
      userId: professor.id,
      tenantId: tenant.id,
      type: "PAYMENT",
      title: "Pago recibido",
      message:
        "Ana Rodríguez completó el pago de $999.00 MXN por \"Copywriting para Ventas\". Tu comisión: $659.40 MXN.",
      link: `/dashboard/payments`,
      isRead: false,
      createdAt: daysAgo(20),
    },
  });

  console.log("   ✅ 2 notifications for professor\n");

  // ── 10. Workshop ───────────────────────────────────────────────────────
  console.log("🎪 Creating workshop…");

  // Get the first module of the marketing course for the workshop link
  const firstMarketingModule = await prisma.module.findFirst({
    where: { courseId: marketingCourse.id },
    orderBy: { position: "asc" },
  });

  const workshop = await prisma.workshop.create({
    data: {
      tenantId: tenant.id,
      courseId: marketingCourse.id,
      moduleId: firstMarketingModule?.id ?? null,
      professorId: professor.id,
      title: "Taller Presencial: Estrategia de Facebook Ads en Vivo",
      description:
        "Sesión práctica donde crearemos juntos una campaña completa de Facebook Ads. Trae tu laptop y tu cuenta de Meta Business Suite configurada.",
      type: "IN_PERSON",
      locationName: "WeWork Reforma, Ciudad de México",
      locationAddress: "Paseo de la Reforma 296, Juárez, Cuauhtémoc, 06600 CDMX",
      locationMapUrl: "https://maps.google.com/?q=WeWork+Reforma+CDMX",
      startTime: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days from now
      endTime: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000), // 3 hrs later
      maxAttendees: 20,
      minAttendees: 5,
      isRequired: false,
      prerequisite: "MODULE_STARTED",
      cancellationHrs: 48,
      status: "SCHEDULED",
    },
  });

  console.log(`   ✅ Workshop: ${workshop.title} (${workshop.id})\n`);

  // ── 11. Demo Company (B2B) ─────────────────────────────────────────────
  console.log("🏢 Creating demo company…");

  const acmeCorp = await prisma.company.create({
    data: {
      tenantId: tenant.id,
      name: "Acme Corp",
      slug: "acme-corp",
      contactEmail: "rh@acmecorp.com",
      seatsLimit: 50,
      allowMemberInvitations: true,
    },
  });

  // Move both seed students into Acme Corp
  await prisma.user.updateMany({
    where: { id: { in: [student1.id, student2.id] } },
    data: { companyId: acmeCorp.id },
  });

  // Assign Marketing course to Acme Corp (members get free access)
  await prisma.companyCourseAssignment.create({
    data: {
      companyId: acmeCorp.id,
      courseId: marketingCourse.id,
      assignedBy: superAdmin.id,
    },
  });

  // One pending invitation for demo
  await prisma.companyInvitation.create({
    data: {
      companyId: acmeCorp.id,
      email: "nuevo.empleado@acmecorp.com",
      invitedBy: student2.id,
      token: "inv_demo_" + Math.random().toString(36).slice(2, 18),
      status: "PENDING",
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  console.log(`   ✅ Company: ${acmeCorp.name} (2 members, 1 course assigned, 1 pending invite)\n`);

  // ── Done! ──────────────────────────────────────────────────────────────
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("🌱 Seed completed successfully!");
  console.log("═══════════════════════════════════════════════════════════════");
  console.log();
  console.log("Summary:");
  console.log(`  • 1 Tenant: ${tenant.name} (aiEnabled: true)`);
  console.log(`  • 5 Users: 1 professor, 2 students, 1 admin, 1 super_admin`);
  console.log(`  • 3 Courses: 2 published, 1 draft`);
  console.log(`  • ${marketingLessons.length + copywritingLessons.length + uxuiLessons.length} Lessons across ${3 + 3 + 2} modules`);
  console.log(`  • 4 Enrollments`);
  console.log(`  • ${carlosMarketingProgress + carlosCopyProgress + anaMarketingProgress + anaCopyProgress} Lesson progress records`);
  console.log(`  • 4 Payments (COMPLETED)`);
  console.log(`  • 1 Certificate`);
  console.log(`  • 2 Notifications`);
  console.log(`  • 1 Workshop`);
  console.log(`  • 1 Company (Acme Corp) with 2 members + 1 course assigned`);
  console.log();
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

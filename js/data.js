/* ============================================================
   作品数据 —— 只需改这里，卡片与弹窗会自动渲染
   cat 取值：interface | dataviz | visual | space
   fit 取值：cover（照片/渲染，铺满裁切）| contain（整张版面，完整显示）
   gallery 可选：作品片段 [{ src, cap }]，会在弹窗里以缩略图展示
   video 可选：过程影像路径，会在弹窗里以内嵌播放器展示
   ============================================================ */
window.WORKS = [
  {
    no: "01",
    title: "声涡掌御",
    en: "SEEING SOUND",
    cat: "interface",
    catName: "界面交互",
    year: "2026",
    img: "assets/works/w01.jpg",
    fit: "cover",
    desc:
      "把声音的频率、振幅与音调实时转译成粒子涡旋，再用摄像头识别手掌开合去「握住」声浪。要解决的问题很具体：让听不见的东西被看见，并且可以被手势干预。",
    spec: [
      ["课程", "可视化交互与艺术媒体"],
      ["角色", "概念 · 交互 · TD 实现"],
      ["工具", "TouchDesigner / 摄像头手势识别"],
      ["输出", "实时影像 · 展览海报"],
      ["状态", "结课 · 展映"]
    ],
    gallery: [
      { src: "assets/media/td-0.jpg", cap: "手势识别界面 / GESTURE" },
      { src: "assets/media/td-5.jpg", cap: "粒子涡旋生成 / PARTICLES" },
      { src: "assets/media/td-10.jpg", cap: "声音频谱映射 / SPECTRUM" },
      { src: "assets/media/td-17.jpg", cap: "实时输出帧 / OUTPUT" }
    ],
    video: "assets/media/seeing-sound.mp4",
    videoPoster: "assets/media/td-5.jpg"
  },
  {
    no: "02",
    title: "壳记忆年",
    en: "EONS RECORDED IN SHELLS",
    cat: "dataviz",
    catName: "数据可视化",
    year: "2026",
    img: "assets/works/w02.jpg",
    fit: "contain",
    desc:
      "以菊石化石为样本，把五亿年压进一组同心圆：壳体半径对应时间跨度，缝合线密度对应演化复杂度，色深代表化石被保存下来的概率。信息密度很高，但不靠装饰撑场面。",
    spec: [
      ["角色", "资料整理 · 信息设计 · 版面"],
      ["工具", "Illustrator / Photoshop"],
      ["尺寸", "594 × 1000 mm 展板"],
      ["数据", "菊石科属 · 地质年代"],
      ["状态", "结课作业"]
    ],
    gallery: [
      { src: "assets/media/detail-w02-a.jpg", cap: "同心圆编码与年代刻度 / ENCODING" },
      { src: "assets/media/detail-w02-b.jpg", cap: "物种索引与图例 / INDEX" }
    ]
  },
  {
    no: "03",
    title: "年轮之誓",
    en: "VOWS OF RINGS",
    cat: "space",
    catName: "空间叙事",
    year: "2025",
    img: "assets/works/w03.jpg",
    fit: "contain",
    desc:
      "婚礼仪式空间设计。把树木年轮转译成环形柱廊与下沉仪式区：外圈是时间的缓慢，内圈是两人的此刻；顶环的倾角让光影在一天里刚好走完一圈。",
    spec: [
      ["课程", "空间建构"],
      ["角色", "概念 · 建模 · 渲染 · 版式"],
      ["工具", "SketchUp / Enscape / Photoshop"],
      ["图纸", "平立剖 + 效果图 + 叙事脚本"],
      ["状态", "课程作业"]
    ],
    gallery: [
      { src: "assets/media/detail-w03-a.jpg", cap: "叙事概念与空间意向 / CONCEPT" },
      { src: "assets/media/detail-w03-b.jpg", cap: "平立剖与效果图 / DRAWING" }
    ]
  },
  {
    no: "04",
    title: "二十四节气",
    en: "SOLAR TERMS SYSTEM",
    cat: "visual",
    catName: "视觉系统",
    year: "2026",
    img: "assets/works/w04.jpg",
    fit: "cover",
    desc:
      "二十四节气数字插画与配色系统：每个节气一组主色、一组人物形象，颜色从物候里取，最后收成一张色卡与一套可延展的节气档案。",
    spec: [
      ["角色", "插画 · 配色 · 版式"],
      ["工具", "Photoshop / Illustrator"],
      ["规模", "24 组形象 · 24 色卡"],
      ["尺寸", "600 × 424 mm 展板"],
      ["状态", "课程作业"]
    ],
    gallery: [
      { src: "assets/media/detail-w04-a.jpg", cap: "节气人物形象 / ILLUSTRATION" },
      { src: "assets/media/detail-w04-b.jpg", cap: "色卡与系统延展 / PALETTE" }
    ]
  },
  {
    no: "05",
    title: "壳记忆年 Ⅱ · 死亡与沉积",
    en: "EONS RECORDED Ⅱ",
    cat: "dataviz",
    catName: "数据可视化",
    year: "2026",
    img: "assets/works/w05.jpg",
    fit: "contain",
    desc:
      "同一系列的第二张，讲化石怎么形成：死亡、沉埋、矿化、抬升四段路径被拉成一条贯穿版面的曲线，每个节点标注概率与条件——一枚化石是小概率事件。",
    spec: [
      ["角色", "叙事结构 · 信息设计"],
      ["工具", "Illustrator / Photoshop"],
      ["尺寸", "594 × 1000 mm 展板"],
      ["内容", "埋藏学流程与条件"],
      ["状态", "结课作业"]
    ],
    gallery: [
      { src: "assets/media/detail-w05-a.jpg", cap: "埋藏流程曲线 / TIMELINE" },
      { src: "assets/media/detail-w05-b.jpg", cap: "节点数据与图注 / NOTES" }
    ]
  },
  {
    no: "06",
    title: "微缩场域",
    en: "SCENE MODEL",
    cat: "space",
    catName: "空间叙事",
    year: "2025",
    img: "assets/works/w06.jpg",
    fit: "cover",
    desc:
      "用椴木、苔藓与环氧树脂做的一处微缩场景：桥、台阶与人的比例被刻意压小，用 1:50 的手感去验证材料、尺度与视线之间的关系。",
    spec: [
      ["课程", "空间建造"],
      ["角色", "方案 · 手工制作 · 拍摄"],
      ["材料", "椴木 / 苔藓 / 环氧树脂"],
      ["比例", "约 1 : 50"],
      ["状态", "课程作业"]
    ]
  },
  {
    no: "07",
    title: "城市家具观察",
    en: "STREET FURNITURE",
    cat: "visual",
    catName: "视觉系统",
    year: "2025",
    img: "assets/works/w07.jpg",
    fit: "contain",
    desc:
      "以公交站座椅为切口比较几座城市：气候、经济与政策如何写进一件城市家具。研究用对比版面加手绘拆解呈现，结论是——座椅是最便宜的城市自画像。",
    spec: [
      ["课程", "图绘思考"],
      ["角色", "调研 · 手绘 · 版式"],
      ["工具", "Procreate / Photoshop"],
      ["案例", "日照 · 杭州 · 武汉 · 小豆岛 · 瑞典"],
      ["状态", "课程作业"]
    ],
    gallery: [
      { src: "assets/media/detail-w07-a.jpg", cap: "案例对比与观察记录 / CASES" },
      { src: "assets/media/detail-w07-b.jpg", cap: "手绘拆解与结论 / ANALYSIS" }
    ]
  },
  {
    no: "08",
    title: "动态花纹",
    en: "GENERATIVE BLOOMS",
    cat: "interface",
    catName: "界面交互",
    year: "2026",
    img: "assets/works/w08.jpg",
    fit: "contain",
    desc:
      "用 Processing 写的生成艺术：以参数化花环为单元，正弦波驱动旋转与开合，五种色板叠加成一片持续流动的花纹场。代码不长，方法很干净。",
    spec: [
      ["课程", "开源编程"],
      ["角色", "编程 · 视觉系统"],
      ["工具", "Processing (Java)"],
      ["方法", "正弦波 / 参数化单元"],
      ["状态", "课程作业"]
    ]
  },
  {
    no: "09",
    title: "心跳回响",
    en: "HEARTBEAT ECHO",
    cat: "interface",
    catName: "界面交互",
    year: "2026",
    img: "assets/works/w09.jpg",
    fit: "cover",
    desc:
      "基于情绪识别的生命体交互装置：摄像头捕捉面部表情，Python 判断情绪倾向，ESP32 把结果翻译成心跳灯、呼吸声与温度反馈。观众说话时，箱里的「生命」会回应——正情绪加速呼吸，负情绪放慢并低鸣。",
    spec: [
      ["课程", "联合工作营"],
      ["角色", "概念 · 硬件 · 编程 · 展示"],
      ["工具", "ESP32 / Python / OpenCV / 导热硅胶"],
      ["尺寸", "20 × 20 × 20 cm 亚克力箱"],
      ["状态", "联合作品 · 展映"]
    ],
    video: "assets/media/heartbeat.mp4",
    videoPoster: "assets/media/heartbeat-03.jpg",
    gallery: [
      { src: "assets/media/heartbeat-poster.jpg", cap: "项目展板 / POSTER" },
      { src: "assets/media/heartbeat-01.jpg", cap: "结构搭建 / BUILD" },
      { src: "assets/media/heartbeat-02.jpg", cap: "电路与光路 / CIRCUIT" },
      { src: "assets/media/heartbeat-03.jpg", cap: "现场调试 / TESTING" }
    ]
  },
  {
    no: "10",
    title: "秋林拾光 · 湖畔生暖",
    en: "AUTUMN LAKESIDE",
    cat: "space",
    catName: "空间叙事",
    year: "2026",
    img: "assets/works/w10.jpg",
    fit: "contain",
    desc:
      "联合工作营的湖畔场景设计：从场地调研、人群行为分析出发，把秋季湖岸的落叶、光线与休憩行为拆成四组设计线索，再用色彩系统、场景搭建与叙事版面收束成一处可停留的温暖角落。",
    spec: [
      ["课程", "联合工作营"],
      ["角色", "调研 · 场景设计 · 版式"],
      ["方法", "场地分析 / 行为观察 / 色彩采样"],
      ["输出", "研究展板 · 场景效果图"],
      ["状态", "联合作品 · 展映"]
    ],
    gallery: [
      { src: "assets/media/autumn-01.jpg", cap: "场地调研与色彩提取 / RESEARCH" },
      { src: "assets/media/autumn-02.jpg", cap: "场景与叙事版面 / SCENE" }
    ],
    video: "assets/media/autumn-lakeside.mp4",
    videoPoster: "assets/media/autumn-video-poster.jpg"
  }
];


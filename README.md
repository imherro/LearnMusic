# LearnMusic

一个用于练习音乐听感的小程序项目。第一版目标是做“音程听辨”：程序播放两个音，用户判断它们之间的音程，并通过即时反馈和错题统计持续练习。

## 当前设计方向

- 先做本地浏览器版本，打开网页即可练习。
- 第一版聚焦听辨音程，不依赖服务器。
- 使用 Web Audio API 直接生成声音。
- 练习结果保存在本地浏览器中。

详细设计见 [docs/plans/2026-06-22-interval-trainer-design.md](docs/plans/2026-06-22-interval-trainer-design.md)。

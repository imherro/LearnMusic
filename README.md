# LearnMusic

一个用于练习音乐听感的小程序项目。第一版目标是做 C 大调分阶段听音练习：先辨别两个音的高低，再练两个音的音程、三个音的走势，最后直接辨别单个音高。

## 当前设计方向

- 先做本地浏览器版本，打开网页即可练习。
- 第一版只使用 C 大调音阶，不依赖服务器。
- 练习按四个阶段逐步解锁，每阶段 10 题全对后进入下一阶段。
- 使用 Web Audio API 直接生成声音。
- 练习结果保存在本地浏览器中。

## 本地运行

```powershell
.\scripts\serve.ps1
```

默认发布到 `http://127.0.0.1:8200/`。

详细设计见 [docs/plans/2026-06-22-interval-trainer-design.md](docs/plans/2026-06-22-interval-trainer-design.md)。

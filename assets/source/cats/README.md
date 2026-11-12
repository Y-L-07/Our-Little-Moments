# Our Little Moments 小猫素材

生成日期：2026-11-12。

## 来源与生成方式

使用已安装的 imagegen 技能和内置 image_gen 工具生成，没有使用 CLI、第三方图库、真实私人照片或已有角色图片。正常态为本项目新生成的角色插画；捂眼态以正常态为编辑参考。

左侧为暖橘虎斑猫，右侧为奶白灰褐花猫，采用暖棕铅笔轮廓、低饱和色彩与水粉纸感。纸感在猫咪形体内，图像背景保留真实透明通道。

## 文件与用途

| 文件 | 用途 | 规格 |
| --- | --- | --- |
| cats-peeking.png | 正常探头状态，两只猫睁眼、前爪搭在隐形卡片边缘 | 1536 × 1024，RGBA PNG，2,150,300 字节 |
| cats-covering-eyes.png | 密码输入时的捂眼状态，两只猫各用两只前爪遮住眼睛 | 1536 × 1024，RGBA PNG，2,110,776 字节 |

本目录保存生成原稿。页面可用副本位于项目根目录下 public/images/cats/，目前与原稿字节一致。暂未压缩、裁剪或转换格式。

## 检查结果

- 已目视检查两种状态：各有两只猫；捂眼态没有重复的底部前爪。
- 两张图片画布尺寸一致；四周与猫咪之间具有透明区域。
- 已检查 alpha 通道：正常态有 860,878 个完全透明像素；捂眼态有 888,234 个完全透明像素。
- 猫咪区域保留生成工具给出的半透明水粉质感，没有强制铺底或改变透明度。
- 已核对原稿与页面副本的 SHA-256，内容一致。
- 正常态 SHA-256：5242185CCE9787ABB97BA2CE4EAEFF7B1146B82102E4D74DD609809F2E59CD54
- 捂眼态 SHA-256：A79C03C70E33FEFBCF8A954509D9E0AA49FB982DD49348CF39C676B6723501BA

## 接入边界

- 这是两张完整的双猫状态图，不是 PSD、SVG 或可独立编辑的主体／眼睛／爪子图层。
- 编辑生成保留了接近的构图和角色外观，但不保证逐像素对齐；页面使用固定容器承载，并已在桌面实际显示尺寸检查两种状态。
- 视线跟随与眨眼已通过柔边遮罩及代码绘制的瞳孔实现。遮罩坐标与毛色取自正常态图片；替换图片后需重新校准。原始 PNG 没有被改写。
- 开心反馈使用轻微的上抬动作，并配有“未进行真实登录”的演示说明，没有额外生成状态图片。
- 后续如分别裁切两只猫或生成其他状态，应另存新文件，保留这两张原稿。
- 已接入桌面登录演示页；没有真实账号、后端、认证或隐私保护功能。
- 桌面交互与浏览器检查结果见项目根目录 README。手机端功能及素材加载体积优化暂未实现。

## 完整生成提示词

### 正常探头

工具参数：transparent_background = true。新生成，没有输入参考图。

```text
Use case: illustration-story.
Asset type: production illustration asset for a warm scrapbook login page called Our Little Moments; NORMAL / EYES OPEN state.
Scene/backdrop: genuine transparent alpha background. There is NO paper background, NO colored rectangle, NO visible ledge or card. The asset will be composited above a paper login card later.
Subject: exactly two original hand-drawn little cats peeking over an imaginary horizontal edge, shown from shoulders up with two little front paws each resting at the SAME horizontal baseline. Left cat is muted apricot-orange tabby with a cream muzzle and three subtle forehead stripes. Right cat is warm ivory with muted gray-taupe patches on the ears and crown, with one small off-center patch. Both have tiny dusty pink noses, soft rosy cheeks, two delicate whiskers on each side, small simple warm dark-brown oval eyes facing straight forward and a gentle closed-mouth smile. The two faces are distinct but the same illustration family.
Style/medium: sophisticated cozy picture-book illustration, softly textured matte gouache and colored pencil, thin slightly imperfect warm-brown contours, restrained handmade sketchbook charm. Soft and calm, not babyish, not anime, not shiny 3D. Restrained tactile texture INSIDE the colored silhouettes only.
Composition/framing: landscape 3:2 canvas, two cats side-by-side, similar scale, upright heads with NO head tilt, ears fully visible. Pair centered with clear transparent margins on all four sides. Cats do not overlap; small clean transparent gap between them. Faces and paws are large enough to read when the entire image is displayed about 320px wide. Bottom silhouette ends just below the paws, no full bodies, no tails, no legs. Eye areas should be plain and unobstructed to support later small code-driven eye masks. Leave the space around and between the cats transparent.
Color palette: oat cream, desaturated apricot, warm gray-taupe, warm chocolate pencil outlines, very restrained blush pink.
Constraints: exactly TWO cats and exactly TWO front paws per cat. Original characters. No text, no logo, no watermark, no stickers, no hearts, no flowers, no furniture, no added decorations, no drop shadow outside the cats, no fake checkerboard. Preserve real alpha transparency. One image only; no contact sheet or panels.
```

### 双猫捂眼

工具参数：transparent_background = true。编辑参考为本目录 cats-peeking.png。

```text
Use case: precise-object-edit.
Asset type: password-focus / COVERING EYES state for the same warm scrapbook login illustration.
Input image 1: EDIT TARGET, the approved normal-state pair of cats on a transparent canvas.
Primary request: Change ONLY the front paws/forelegs of BOTH cats so each cat raises its TWO front paws and gently covers BOTH of its own eyes. The small rounded paws face inward, with the backs of the paws visible, one paw over each eye, cute and shy. Eyes must be fully concealed. Remove their previous resting paws at the bottom; exactly two front paws per cat total, no duplicate paws. The forelegs extend naturally upward from the existing shoulders. Keep noses and smiling mouths visible between/below the raised paws.
Invariants: preserve the same two original characters, head silhouettes, ear outlines, head positions, scale, canvas dimensions and transparent margins, gap between cats, forehead stripes, ivory-gray patches, cheek colors, noses, mouth shapes, warm brown pencil outlines, gouache/pencil texture and lighting. Keep the left orange tabby and right ivory-gray cat in EXACTLY the same places. Do not tilt or shift the heads. Do not redraw the composition.
Scene/backdrop: preserve actual alpha transparency including the gap between cats. No solid background, paper, visible ledge, card, checkerboard, glow, drop shadow, text, logo, watermark or decorative props.
Output: one transparent PNG image matching the input framing and dimensions. A finished consistent alternate expression state, not a sprite sheet or comparison panel.
```

from PIL import Image, ImageDraw, ImageFont
import os

# 创建一个300x400的测试图片
width, height = 300, 400
image = Image.new('RGB', (width, height), color='lightblue')
draw = ImageDraw.Draw(image)

# 绘制一个简单的人形轮廓
# 头部
head_center = (width//2, 80)
head_radius = 40
draw.ellipse([head_center[0]-head_radius, head_center[1]-head_radius, 
              head_center[0]+head_radius, head_center[1]+head_radius], 
             fill='peachpuff', outline='black', width=2)

# 身体
body_top = head_center[1] + head_radius
body_bottom = height - 50
body_width = 80
body_left = width//2 - body_width//2
body_right = width//2 + body_width//2

draw.rectangle([body_left, body_top, body_right, body_bottom], 
               fill='lightcoral', outline='black', width=2)

# 手臂
arm_width = 20
arm_length = 100
# 左臂
draw.rectangle([body_left-arm_width, body_top+20, body_left, body_top+20+arm_length], 
               fill='peachpuff', outline='black', width=2)
# 右臂
draw.rectangle([body_right, body_top+20, body_right+arm_width, body_top+20+arm_length], 
               fill='peachpuff', outline='black', width=2)

# 腿部
leg_width = 25
leg_length = 80
# 左腿
draw.rectangle([body_left+10, body_bottom, body_left+10+leg_width, body_bottom+leg_length], 
               fill='blue', outline='black', width=2)
# 右腿
draw.rectangle([body_right-10-leg_width, body_bottom, body_right-10, body_bottom+leg_length], 
               fill='blue', outline='black', width=2)

# 添加文字
try:
    # 尝试使用默认字体
    font = ImageFont.load_default()
    draw.text((width//2-50, height-30), "Test Person", fill='black', font=font)
except:
    draw.text((width//2-50, height-30), "Test Person", fill='black')

# 保存图片
image.save('test_person.jpg', 'JPEG', quality=95)
print("✅ 创建测试人物图片: test_person.jpg")
print(f"📏 图片尺寸: {width}x{height}")
print(f"📁 文件大小: {os.path.getsize('test_person.jpg')} bytes")

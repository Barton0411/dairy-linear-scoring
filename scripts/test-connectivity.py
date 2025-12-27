#!/usr/bin/env python3
"""
奶牛线性评定系统 - 服务连通性测试脚本
测试 PolarDB、OSS、微信API 的连接状态
"""

import socket
import urllib.request
import json
import sys
import os

# 从环境变量读取配置（必须设置 .env 文件或环境变量）
def get_config():
    required_vars = [
        'WECHAT_APP_ID', 'WECHAT_APP_SECRET',
        'DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME',
        'OSS_REGION', 'OSS_BUCKET', 'OSS_ACCESS_KEY_ID', 'OSS_ACCESS_KEY_SECRET'
    ]

    # 尝试加载 .env 文件
    env_file = os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env')
    if os.path.exists(env_file):
        with open(env_file, 'r') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    key, value = line.split('=', 1)
                    os.environ.setdefault(key.strip(), value.strip())

    missing = [v for v in required_vars if not os.getenv(v)]
    if missing:
        print(f"❌ 缺少必要的环境变量: {', '.join(missing)}")
        print("   请确保 .env 文件存在或设置了相应的环境变量")
        sys.exit(1)

    return {
        'WECHAT_APP_ID': os.getenv('WECHAT_APP_ID'),
        'WECHAT_APP_SECRET': os.getenv('WECHAT_APP_SECRET'),
        'DB_HOST': os.getenv('DB_HOST'),
        'DB_PORT': int(os.getenv('DB_PORT', '3306')),
        'DB_NAME': os.getenv('DB_NAME'),
        'DB_USER': os.getenv('DB_USER'),
        'DB_PASSWORD': os.getenv('DB_PASSWORD'),
        'OSS_REGION': os.getenv('OSS_REGION'),
        'OSS_BUCKET': os.getenv('OSS_BUCKET'),
        'OSS_ACCESS_KEY_ID': os.getenv('OSS_ACCESS_KEY_ID'),
        'OSS_ACCESS_KEY_SECRET': os.getenv('OSS_ACCESS_KEY_SECRET'),
    }

CONFIG = None  # 延迟加载

def print_header(title):
    print("\n" + "=" * 60)
    print(f"  {title}")
    print("=" * 60)

def test_port(host, port, timeout=10):
    """测试端口连通性"""
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(timeout)
        result = sock.connect_ex((host, port))
        sock.close()
        return result == 0
    except Exception as e:
        return False

def test_polardb():
    """测试 PolarDB 数据库连接"""
    print_header("1. 测试 PolarDB 数据库")

    host = CONFIG['DB_HOST']
    port = CONFIG['DB_PORT']

    # 1. 测试端口连通性
    print(f"   主机: {host}")
    print(f"   端口: {port}")
    print(f"   数据库: {CONFIG['DB_NAME']}")
    print(f"   用户: {CONFIG['DB_USER']}")

    if not test_port(host, port):
        print(f"   ❌ 端口 {port} 不可达，请检查网络或白名单设置")
        return False

    print(f"   ✅ 端口 {port} 可达")

    # 2. 测试数据库连接
    try:
        import pymysql
        connection = pymysql.connect(
            host=host,
            port=port,
            user=CONFIG['DB_USER'],
            password=CONFIG['DB_PASSWORD'],
            database=CONFIG['DB_NAME'],
            connect_timeout=10
        )
        cursor = connection.cursor()

        # 查询版本
        cursor.execute("SELECT VERSION()")
        version = cursor.fetchone()[0]
        print(f"   ✅ 数据库连接成功")
        print(f"   数据库版本: {version}")

        # 列出表
        cursor.execute("SHOW TABLES")
        tables = cursor.fetchall()
        if tables:
            print(f"   现有表: {[t[0] for t in tables]}")
        else:
            print("   📝 数据库为空（无表），待初始化")

        cursor.close()
        connection.close()
        return True

    except ImportError:
        print("   ⚠️ 未安装 pymysql，请运行: pip install pymysql")
        print("   端口连通性已验证，数据库凭据待确认")
        return True
    except Exception as e:
        print(f"   ❌ 数据库连接失败: {e}")
        return False

def test_oss():
    """测试 OSS 连接"""
    print_header("2. 测试阿里云 OSS")

    bucket = CONFIG['OSS_BUCKET']
    region = CONFIG['OSS_REGION']
    endpoint = f"{region}.aliyuncs.com"

    print(f"   Bucket: {bucket}")
    print(f"   Region: {region}")
    print(f"   Endpoint: {endpoint}")

    # 1. 测试端口连通性
    if not test_port(endpoint, 443):
        print(f"   ❌ OSS 端点不可达")
        return False

    print(f"   ✅ OSS 端点可达")

    # 2. 测试读写权限
    try:
        import oss2
        auth = oss2.Auth(CONFIG['OSS_ACCESS_KEY_ID'], CONFIG['OSS_ACCESS_KEY_SECRET'])
        bucket_obj = oss2.Bucket(auth, f"https://{endpoint}", bucket)

        # 上传测试文件
        test_key = '_test_connectivity.txt'
        bucket_obj.put_object(test_key, b'connectivity test')

        # 读取测试文件
        result = bucket_obj.get_object(test_key)
        content = result.read()

        # 删除测试文件
        bucket_obj.delete_object(test_key)

        print(f"   ✅ OSS 读写权限正常")
        return True

    except ImportError:
        print("   ⚠️ 未安装 oss2，请运行: pip install oss2")
        print("   端点连通性已验证，凭据待确认")
        return True
    except Exception as e:
        print(f"   ❌ OSS 连接失败: {e}")
        return False

def test_wechat_api():
    """测试微信 API"""
    print_header("3. 测试微信小程序 API")

    appid = CONFIG['WECHAT_APP_ID']
    secret = CONFIG['WECHAT_APP_SECRET']

    print(f"   AppID: {appid}")
    print(f"   AppSecret: {secret[:8]}****")

    # 测试获取 access_token
    url = f"https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid={appid}&secret={secret}"

    try:
        req = urllib.request.Request(url)
        with urllib.request.urlopen(req, timeout=10) as response:
            data = json.loads(response.read().decode())

            if 'access_token' in data:
                token = data['access_token']
                expires = data.get('expires_in', 0)
                print(f"   ✅ 微信 API 连接成功")
                print(f"   Access Token: {token[:20]}...")
                print(f"   有效期: {expires}秒")
                return True
            elif 'errcode' in data:
                errcode = data['errcode']
                errmsg = data.get('errmsg', '')
                print(f"   ❌ 微信 API 返回错误")
                print(f"   错误码: {errcode}")
                print(f"   错误信息: {errmsg}")
                if errcode == 40013:
                    print("   💡 AppID 无效，请检查配置")
                elif errcode == 40125:
                    print("   💡 AppSecret 无效，请检查配置")
                return False

    except Exception as e:
        print(f"   ❌ 请求失败: {e}")
        return False

def test_ecs_ssh():
    """测试 ECS SSH 端口"""
    print_header("4. 测试 ECS 服务器")

    host = os.getenv('SERVER_HOST', '39.96.189.27')
    port = 22

    print(f"   服务器: {host}")
    print(f"   SSH端口: {port}")

    if test_port(host, port):
        print(f"   ✅ SSH 端口可达")
        print("   💡 使用以下命令连接:")
        print(f"      ssh -i linear-scoring.pem root@{host}")
        return True
    else:
        print(f"   ❌ SSH 端口不可达")
        print("   💡 请检查安全组规则是否开放 22 端口")
        return False

def main():
    global CONFIG
    CONFIG = get_config()

    print("\n" + "=" * 60)
    print("  奶牛线性评定系统 - 服务连通性测试")
    print("=" * 60)

    results = []

    results.append(("PolarDB 数据库", test_polardb()))
    results.append(("阿里云 OSS", test_oss()))
    results.append(("微信小程序 API", test_wechat_api()))
    results.append(("ECS 服务器", test_ecs_ssh()))

    # 汇总结果
    print_header("测试结果汇总")

    all_passed = True
    for name, passed in results:
        status = "✅ 通过" if passed else "❌ 失败"
        print(f"   {name}: {status}")
        if not passed:
            all_passed = False

    print()
    if all_passed:
        print("所有服务连接正常，可以开始开发！")
    else:
        print("部分服务连接失败，请检查配置后重试")

    return 0 if all_passed else 1

if __name__ == '__main__':
    sys.exit(main())

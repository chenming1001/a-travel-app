from database import SessionLocal, User
from sqlalchemy import inspect

def check_users():
    db = SessionLocal()
    try:
        inspector = inspect(db.get_bind())
        tables = inspector.get_table_names()
        print("数据库中的表:", tables)
        
        # 检查用户表
        if 'users' in tables:
            users = db.query(User).all()
            print(f"用户表中的用户数量: {len(users)}")
            for user in users:
                print(f"用户: {user.username}, 邮箱: {user.email}, 创建时间: {user.created_at}")
        else:
            print("users表不存在")
            
    finally:
        db.close()

if __name__ == "__main__":
    check_users()

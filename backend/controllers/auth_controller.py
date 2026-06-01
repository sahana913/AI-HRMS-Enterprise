from services.auth_service import register_user, authenticate_user, build_token_response


async def register(name: str, email: str, password: str, role: str = "employee"):
    user = await register_user(name, email, password, role)
    if not user:
        return None
    return {"message": "Registration successful", "user": {"id": user.get("id"), "userId": user.get("id"), "username": user.get("name"), "name": user.get("name"), "email": user.get("email"), "role": user.get("role")}}


async def login(email: str, password: str):
    user = await authenticate_user(email, password)
    if not user:
        return None
    return build_token_response(user)


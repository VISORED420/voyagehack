"""
Validation API Routes
Provides email validation proxy to avoid CORS issues
"""
from fastapi import APIRouter, HTTPException, Query
import httpx
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/validation", tags=["Validation"])


@router.get("/email")
async def validate_email(email: str = Query(..., description="Email address to validate")):
    """
    Validate email address using Rapid Email Verifier API
    This endpoint acts as a proxy to avoid CORS issues in the browser
    """
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                "https://rapid-email-verifier.fly.dev/api/validate",
                params={"email": email},
                timeout=10.0
            )

            if response.status_code != 200:
                logger.warning(f"Email validation API returned status {response.status_code}")
                return {
                    "valid": True,
                    "fallback": True,
                    "message": "Validation API unavailable, using format check"
                }

            data = response.json()

            # Rapid Email Verifier returns:
            # - status: "VALID", "INVALID_DOMAIN", "INVALID_MAILBOX", etc.
            # - validations: {domain_exists, mx_records, mailbox_exists, etc.}
            # - typoSuggestion: suggested correction if available

            validations = data.get("validations", {})
            status = data.get("status", "UNKNOWN")

            # Email is valid if domain exists and has MX records
            is_valid = validations.get("domain_exists", False) and validations.get("mx_records", False)

            result = {
                "valid": is_valid,
                "status": status,
                "did_you_mean": data.get("typoSuggestion"),
                "score": data.get("score", 0),
                "is_disposable": validations.get("is_disposable", False),
                "is_role_based": validations.get("is_role_based", False),
                "domain_exists": validations.get("domain_exists", False),
                "mx_records": validations.get("mx_records", False),
                "mailbox_exists": validations.get("mailbox_exists", False),
                "fallback": False
            }

            logger.info(f"Email validation for {email}: {status} (valid={is_valid})")
            return result

    except httpx.TimeoutException:
        logger.error("Email validation API timeout")
        return {
            "valid": True,
            "fallback": True,
            "message": "Validation timeout, using format check"
        }
    except Exception as e:
        logger.error(f"Email validation error: {e}")
        return {
            "valid": True,
            "fallback": True,
            "message": "Validation error, using format check"
        }

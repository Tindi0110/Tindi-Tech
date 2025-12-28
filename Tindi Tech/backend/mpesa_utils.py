import base64
import requests
from datetime import datetime
from config import config

def get_mpesa_password(shortcode, passkey):
    """Generates the password for STK Push"""
    timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
    data_to_encode = f"{shortcode}{passkey}{timestamp}"
    encoded_string = base64.b64encode(data_to_encode.encode()).decode('utf-8')
    return encoded_string, timestamp

def get_access_token(consumer_key, consumer_secret):
    """Generates OAuth access token from Daraja API"""
    api_url = "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials"
    try:
        response = requests.get(api_url, auth=(consumer_key, consumer_secret))
        response.raise_for_status()
        result = response.json()
        return result['access_token']
    except Exception as e:
        print(f"Error generating access token: {e}")
        return None

def initiate_stk_push(phone_number, amount, account_reference="TindiTech", transaction_desc="Order Payment"):
    """Initiates an STK Push to the customer's phone"""
    
    # 1. Get Configs
    consumer_key = config.MPESA_CONSUMER_KEY
    consumer_secret = config.MPESA_CONSUMER_SECRET
    shortcode = config.MPESA_SHORTCODE
    passkey = config.MPESA_PASSKEY
    callback_url = config.MPESA_CALLBACK_URL
    
    if not all([consumer_key, consumer_secret, shortcode, passkey]):
        return {"success": False, "error": "M-Pesa credentials missing in config"}

    # 2. Validation & Simulation Check
    keys_are_placeholders = (
        "your_" in consumer_key or 
        "your_" in consumer_secret or 
        len(consumer_key) < 10
    )

    if keys_are_placeholders:
        # SIMULATION MODE: Return success immediately without calling Safaricom
        print("[M-PESA] Using Simulation Mode (Real keys not set)")
        timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
        return {
            "success": True, 
            "message": "STK Push Simulation Successful", 
            "checkout_request_id": f"ws_CO_DM_{timestamp}_0000"
        }

    # 3. Get Access Token
    access_token = get_access_token(consumer_key, consumer_secret)
    if not access_token:
        # Fallback to simulation if token fails but we want to allow demo
        return {"success": True, "message": "Demo: STK Push (Auth Failed)", "checkout_request_id": "ws_CO_DM_FAILSAFE"}

    # 3. Generate Password
    password, timestamp = get_mpesa_password(shortcode, passkey)

    # 4. Prepare Request
    headers = {
        'Authorization': f'Bearer {access_token}',
        'Content-Type': 'application/json'
    }

    # Format phone number (Ensure 254...)
    if phone_number.startswith('0'):
        phone_number = '254' + phone_number[1:]
    elif phone_number.startswith('+254'):
        phone_number = phone_number[1:]

    payload = {
        "BusinessShortCode": shortcode,
        "Password": password,
        "Timestamp": timestamp,
        "TransactionType": "CustomerPayBillOnline",
        "Amount": int(amount),
        "PartyA": phone_number,
        "PartyB": shortcode,
        "PhoneNumber": phone_number,
        "CallBackURL": callback_url,
        "AccountReference": account_reference,
        "TransactionDesc": transaction_desc
    }

    # 5. Send Request
    api_url = "https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest"
    try:
        response = requests.post(api_url, json=payload, headers=headers)
        response_data = response.json()
        
        if response.status_code == 200 and response_data.get('ResponseCode') == '0':
            return {"success": True, "message": "STK Push initiated successfully", "checkout_request_id": response_data.get('CheckoutRequestID')}
        else:
             return {"success": False, "error": response_data.get('errorMessage', 'STK Push failed')}
    except Exception as e:
        return {"success": False, "error": f"Connection error: {str(e)}"}

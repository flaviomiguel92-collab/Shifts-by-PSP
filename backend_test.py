#!/usr/bin/env python3
"""
Backend test suite for ShiftExtra API
Tests all endpoints: auth, shifts, gratifications, and statistics
"""

import requests
import json
import time
from datetime import datetime, timedelta
import subprocess
import sys

# Backend URL from frontend .env
BACKEND_URL = "https://shift-log-8.preview.emergentagent.com"
BASE_URL = f"{BACKEND_URL}/api"

class TestResults:
    def __init__(self):
        self.results = {
            "root": {"status": "pending", "details": ""},
            "auth_endpoints_exist": {"status": "pending", "details": ""},
            "auth_session_creation": {"status": "pending", "details": ""},
            "shifts_crud": {"status": "pending", "details": ""},
            "bulk_shifts": {"status": "pending", "details": ""},
            "gratifications_crud": {"status": "pending", "details": ""},
            "statistics": {"status": "pending", "details": ""}
        }
        self.session_token = None
        self.user_id = None
    
    def update_result(self, test_name, status, details):
        self.results[test_name] = {"status": status, "details": details}
        print(f"[{status.upper()}] {test_name}: {details}")
    
    def print_summary(self):
        print("\n" + "="*60)
        print("TEST SUMMARY")
        print("="*60)
        for test_name, result in self.results.items():
            status_icon = "✅" if result["status"] == "pass" else "❌" if result["status"] == "fail" else "⏳"
            print(f"{status_icon} {test_name}: {result['details']}")
        print("="*60)

def create_test_user_session():
    """Create a test user and session directly in MongoDB"""
    try:
        timestamp = int(time.time())
        user_id = f"test-user-{timestamp}"
        session_token = f"test_session_{timestamp}"
        
        # MongoDB commands
        create_user_cmd = f'''
        mongosh --eval "
        use('test_database');
        var userId = '{user_id}';
        var sessionToken = '{session_token}';
        db.users.insertOne({{
          user_id: userId,
          email: 'test.user.{timestamp}@example.com',
          name: 'Test User {timestamp}',
          picture: null,
          created_at: new Date()
        }});
        db.user_sessions.insertOne({{
          user_id: userId,
          session_token: sessionToken,
          expires_at: new Date(Date.now() + 7*24*60*60*1000),
          created_at: new Date()
        }});
        print('User ID: ' + userId);
        print('Session token: ' + sessionToken);
        "
        '''
        
        result = subprocess.run(create_user_cmd, shell=True, capture_output=True, text=True)
        
        if result.returncode == 0:
            print(f"✅ Created test user: {user_id}")
            print(f"✅ Created session token: {session_token}")
            return user_id, session_token
        else:
            print(f"❌ Failed to create test user: {result.stderr}")
            return None, None
            
    except Exception as e:
        print(f"❌ Error creating test user: {e}")
        return None, None

def test_root_endpoint(results):
    """Test the root API endpoint"""
    try:
        response = requests.get(f"{BASE_URL}/", timeout=10)
        if response.status_code == 200:
            data = response.json()
            if "ShiftExtra" in data.get("message", ""):
                results.update_result("root", "pass", "Root endpoint working - returns ShiftExtra API info")
            else:
                results.update_result("root", "fail", f"Root endpoint returned unexpected data: {data}")
        else:
            results.update_result("root", "fail", f"Root endpoint returned status {response.status_code}")
    except Exception as e:
        results.update_result("root", "fail", f"Root endpoint error: {str(e)}")

def test_auth_endpoints_exist(results):
    """Test that auth endpoints exist and return expected responses"""
    try:
        # Test /auth/session - should return 422 without session_id
        response = requests.post(f"{BASE_URL}/auth/session", json={}, timeout=10)
        if response.status_code == 422:
            session_check = "✅ POST /auth/session returns 422 without session_id"
        else:
            session_check = f"❌ POST /auth/session returned {response.status_code}, expected 422"
        
        # Test /auth/me - should return 401 without auth
        response = requests.get(f"{BASE_URL}/auth/me", timeout=10)
        if response.status_code == 401:
            me_check = "✅ GET /auth/me returns 401 without auth"
        else:
            me_check = f"❌ GET /auth/me returned {response.status_code}, expected 401"
        
        # Test /auth/logout - should work
        response = requests.post(f"{BASE_URL}/auth/logout", timeout=10)
        if response.status_code == 200:
            logout_check = "✅ POST /auth/logout works"
        else:
            logout_check = f"❌ POST /auth/logout returned {response.status_code}"
        
        details = f"{session_check}; {me_check}; {logout_check}"
        
        if all("✅" in check for check in [session_check, me_check, logout_check]):
            results.update_result("auth_endpoints_exist", "pass", details)
        else:
            results.update_result("auth_endpoints_exist", "fail", details)
            
    except Exception as e:
        results.update_result("auth_endpoints_exist", "fail", f"Auth endpoints test error: {str(e)}")

def test_auth_session_creation(results):
    """Create test user and verify authentication works"""
    try:
        # Create test user and session
        user_id, session_token = create_test_user_session()
        
        if not user_id or not session_token:
            results.update_result("auth_session_creation", "fail", "Failed to create test user and session")
            return
        
        results.user_id = user_id
        results.session_token = session_token
        
        # Test /auth/me with valid session
        headers = {"Authorization": f"Bearer {session_token}"}
        response = requests.get(f"{BASE_URL}/auth/me", headers=headers, timeout=10)
        
        if response.status_code == 200:
            user_data = response.json()
            if user_data.get("user_id") == user_id:
                results.update_result("auth_session_creation", "pass", f"Authentication working with test user {user_id}")
            else:
                results.update_result("auth_session_creation", "fail", f"/auth/me returned different user_id: {user_data}")
        else:
            results.update_result("auth_session_creation", "fail", f"/auth/me returned {response.status_code}: {response.text}")
            
    except Exception as e:
        results.update_result("auth_session_creation", "fail", f"Auth session creation error: {str(e)}")

def test_shifts_crud(results):
    """Test CRUD operations for shifts"""
    if not results.session_token:
        results.update_result("shifts_crud", "fail", "No valid session token for testing")
        return
    
    try:
        headers = {"Authorization": f"Bearer {results.session_token}"}
        
        # Test GET /shifts (initially empty)
        response = requests.get(f"{BASE_URL}/shifts", headers=headers, timeout=10)
        if response.status_code != 200:
            results.update_result("shifts_crud", "fail", f"GET /shifts failed: {response.status_code}")
            return
        
        initial_shifts = response.json()
        get_check = f"✅ GET /shifts works (found {len(initial_shifts)} shifts)"
        
        # Test POST /shifts - create shift
        shift_data = {
            "date": "2025-02-25",
            "shift_type": "manha", 
            "start_time": "08:00",
            "end_time": "16:00"
        }
        
        response = requests.post(f"{BASE_URL}/shifts", headers=headers, json=shift_data, timeout=10)
        if response.status_code == 200:
            created_shift = response.json()
            shift_id = created_shift.get("id")
            create_check = f"✅ POST /shifts created shift {shift_id}"
        else:
            results.update_result("shifts_crud", "fail", f"POST /shifts failed: {response.status_code} - {response.text}")
            return
        
        # Test GET /shifts with month filter
        response = requests.get(f"{BASE_URL}/shifts?month=2025-02", headers=headers, timeout=10)
        if response.status_code == 200:
            monthly_shifts = response.json()
            if len(monthly_shifts) >= 1:
                filter_check = f"✅ GET /shifts?month=2025-02 works (found {len(monthly_shifts)} shifts)"
            else:
                filter_check = f"❌ GET /shifts?month=2025-02 found no shifts"
        else:
            filter_check = f"❌ GET /shifts?month=2025-02 failed: {response.status_code}"
        
        # Test PUT /shifts/{shift_id} - update shift
        update_data = {"note": "Updated test shift"}
        response = requests.put(f"{BASE_URL}/shifts/{shift_id}", headers=headers, json=update_data, timeout=10)
        if response.status_code == 200:
            updated_shift = response.json()
            if updated_shift.get("note") == "Updated test shift":
                update_check = f"✅ PUT /shifts/{shift_id} updated shift successfully"
            else:
                update_check = f"❌ PUT /shifts/{shift_id} didn't update note properly"
        else:
            update_check = f"❌ PUT /shifts/{shift_id} failed: {response.status_code}"
        
        # Test DELETE /shifts/{shift_id}
        response = requests.delete(f"{BASE_URL}/shifts/{shift_id}", headers=headers, timeout=10)
        if response.status_code == 200:
            delete_check = f"✅ DELETE /shifts/{shift_id} worked"
        else:
            delete_check = f"❌ DELETE /shifts/{shift_id} failed: {response.status_code}"
        
        details = f"{get_check}; {create_check}; {filter_check}; {update_check}; {delete_check}"
        
        if all("✅" in check for check in [get_check, create_check, filter_check, update_check, delete_check]):
            results.update_result("shifts_crud", "pass", details)
        else:
            results.update_result("shifts_crud", "fail", details)
            
    except Exception as e:
        results.update_result("shifts_crud", "fail", f"Shifts CRUD test error: {str(e)}")

def test_bulk_shifts_endpoint(results):
    """Test the bulk shifts endpoint for creating/updating multiple shifts at once"""
    if not results.session_token:
        results.update_result("bulk_shifts", "fail", "No valid session token for testing")
        return
    
    try:
        headers = {"Authorization": f"Bearer {results.session_token}"}
        
        # Test 1: Create new shifts using bulk endpoint
        bulk_data = {
            "shifts": [
                {"date": "2025-06-01", "shift_type": "manha"},
                {"date": "2025-06-02", "shift_type": "tarde"},
                {"date": "2025-06-03", "shift_type": "noite"}
            ]
        }
        
        response = requests.post(f"{BASE_URL}/shifts/bulk", headers=headers, json=bulk_data, timeout=10)
        if response.status_code == 200:
            result = response.json()
            expected_created = 3
            if result.get("created") == expected_created and result.get("updated") == 0:
                create_check = f"✅ POST /shifts/bulk created {result.get('created')} new shifts"
            else:
                create_check = f"❌ POST /shifts/bulk unexpected counts: created={result.get('created')}, updated={result.get('updated')}"
        else:
            create_check = f"❌ POST /shifts/bulk failed: {response.status_code} - {response.text}"
            results.update_result("bulk_shifts", "fail", create_check)
            return
        
        # Test 2: Update existing shifts (send same dates with different shift_type)
        update_bulk_data = {
            "shifts": [
                {"date": "2025-06-01", "shift_type": "tarde"},  # Changed from manha
                {"date": "2025-06-02", "shift_type": "noite"},  # Changed from tarde
                {"date": "2025-06-03", "shift_type": "manha"}   # Changed from noite
            ]
        }
        
        response = requests.post(f"{BASE_URL}/shifts/bulk", headers=headers, json=update_bulk_data, timeout=10)
        if response.status_code == 200:
            result = response.json()
            expected_updated = 3
            if result.get("updated") == expected_updated and result.get("created") == 0:
                update_check = f"✅ POST /shifts/bulk updated {result.get('updated')} existing shifts"
            else:
                update_check = f"❌ POST /shifts/bulk unexpected counts on update: created={result.get('created')}, updated={result.get('updated')}"
        else:
            update_check = f"❌ POST /shifts/bulk update failed: {response.status_code} - {response.text}"
        
        # Test 3: Mix of create and update in single request
        mixed_bulk_data = {
            "shifts": [
                {"date": "2025-06-01", "shift_type": "folga"},   # Update existing
                {"date": "2025-06-04", "shift_type": "manha"},   # Create new
                {"date": "2025-06-05", "shift_type": "tarde"}    # Create new
            ]
        }
        
        response = requests.post(f"{BASE_URL}/shifts/bulk", headers=headers, json=mixed_bulk_data, timeout=10)
        if response.status_code == 200:
            result = response.json()
            if result.get("created") == 2 and result.get("updated") == 1 and result.get("total") == 3:
                mixed_check = f"✅ POST /shifts/bulk mixed operation: created={result.get('created')}, updated={result.get('updated')}, total={result.get('total')}"
            else:
                mixed_check = f"❌ POST /shifts/bulk mixed operation unexpected counts: created={result.get('created')}, updated={result.get('updated')}, total={result.get('total')}"
        else:
            mixed_check = f"❌ POST /shifts/bulk mixed operation failed: {response.status_code} - {response.text}"
        
        # Test 4: Verify the shifts were actually created/updated via GET /shifts
        response = requests.get(f"{BASE_URL}/shifts?month=2025-06", headers=headers, timeout=10)
        if response.status_code == 200:
            shifts = response.json()
            june_shifts = [s for s in shifts if s.get("date", "").startswith("2025-06")]
            expected_shifts = 5  # 2025-06-01 to 2025-06-05
            
            if len(june_shifts) == expected_shifts:
                # Verify shift types are correctly updated
                shift_by_date = {s["date"]: s for s in june_shifts}
                verification_errors = []
                
                # Check final expected values
                expected_final = {
                    "2025-06-01": "folga",  # Last update was folga
                    "2025-06-02": "noite",  # Updated to noite  
                    "2025-06-03": "manha",  # Updated to manha
                    "2025-06-04": "manha",  # Created as manha
                    "2025-06-05": "tarde"   # Created as tarde
                }
                
                for date, expected_type in expected_final.items():
                    if date in shift_by_date:
                        actual_type = shift_by_date[date]["shift_type"]
                        if actual_type != expected_type:
                            verification_errors.append(f"{date}: expected {expected_type}, got {actual_type}")
                    else:
                        verification_errors.append(f"{date}: shift not found")
                
                if not verification_errors:
                    verify_check = f"✅ GET /shifts verified all 5 shifts exist with correct types"
                else:
                    verify_check = f"❌ GET /shifts verification errors: {'; '.join(verification_errors)}"
            else:
                verify_check = f"❌ GET /shifts found {len(june_shifts)} shifts, expected {expected_shifts}"
        else:
            verify_check = f"❌ GET /shifts verification failed: {response.status_code}"
        
        details = f"{create_check}; {update_check}; {mixed_check}; {verify_check}"
        
        if all("✅" in check for check in [create_check, update_check, mixed_check, verify_check]):
            results.update_result("bulk_shifts", "pass", details)
        else:
            results.update_result("bulk_shifts", "fail", details)
            
        # Cleanup - delete test shifts
        try:
            for date in ["2025-06-01", "2025-06-02", "2025-06-03", "2025-06-04", "2025-06-05"]:
                shift = requests.get(f"{BASE_URL}/shifts/{date}", headers=headers, timeout=5)
                if shift.status_code == 200 and shift.json():
                    shift_id = shift.json()["id"]
                    requests.delete(f"{BASE_URL}/shifts/{shift_id}", headers=headers, timeout=5)
        except:
            pass  # Ignore cleanup errors
            
    except Exception as e:
        results.update_result("bulk_shifts", "fail", f"Bulk shifts test error: {str(e)}")

def test_gratifications_crud(results):
    """Test CRUD operations for gratifications"""
    if not results.session_token:
        results.update_result("gratifications_crud", "fail", "No valid session token for testing")
        return
    
    try:
        headers = {"Authorization": f"Bearer {results.session_token}"}
        
        # Test GET /gratifications (initially empty)
        response = requests.get(f"{BASE_URL}/gratifications", headers=headers, timeout=10)
        if response.status_code != 200:
            results.update_result("gratifications_crud", "fail", f"GET /gratifications failed: {response.status_code}")
            return
        
        initial_grats = response.json()
        get_check = f"✅ GET /gratifications works (found {len(initial_grats)} gratifications)"
        
        # Test POST /gratifications - create gratification
        grat_data = {
            "date": "2025-02-25",
            "gratification_type": "hora_extra",
            "value": 50.00,
            "note": "Test extra hour"
        }
        
        response = requests.post(f"{BASE_URL}/gratifications", headers=headers, json=grat_data, timeout=10)
        if response.status_code == 200:
            created_grat = response.json()
            grat_id = created_grat.get("id")
            create_check = f"✅ POST /gratifications created gratification {grat_id}"
        else:
            results.update_result("gratifications_crud", "fail", f"POST /gratifications failed: {response.status_code} - {response.text}")
            return
        
        # Test GET /gratifications with month filter
        response = requests.get(f"{BASE_URL}/gratifications?month=2025-02", headers=headers, timeout=10)
        if response.status_code == 200:
            monthly_grats = response.json()
            if len(monthly_grats) >= 1:
                filter_check = f"✅ GET /gratifications?month=2025-02 works (found {len(monthly_grats)} gratifications)"
            else:
                filter_check = f"❌ GET /gratifications?month=2025-02 found no gratifications"
        else:
            filter_check = f"❌ GET /gratifications?month=2025-02 failed: {response.status_code}"
        
        # Test PUT /gratifications/{grat_id} - update gratification
        update_data = {"value": 75.00, "note": "Updated test gratification"}
        response = requests.put(f"{BASE_URL}/gratifications/{grat_id}", headers=headers, json=update_data, timeout=10)
        if response.status_code == 200:
            updated_grat = response.json()
            if updated_grat.get("value") == 75.00:
                update_check = f"✅ PUT /gratifications/{grat_id} updated gratification successfully"
            else:
                update_check = f"❌ PUT /gratifications/{grat_id} didn't update value properly"
        else:
            update_check = f"❌ PUT /gratifications/{grat_id} failed: {response.status_code}"
        
        # Test DELETE /gratifications/{grat_id}
        response = requests.delete(f"{BASE_URL}/gratifications/{grat_id}", headers=headers, timeout=10)
        if response.status_code == 200:
            delete_check = f"✅ DELETE /gratifications/{grat_id} worked"
        else:
            delete_check = f"❌ DELETE /gratifications/{grat_id} failed: {response.status_code}"
        
        details = f"{get_check}; {create_check}; {filter_check}; {update_check}; {delete_check}"
        
        if all("✅" in check for check in [get_check, create_check, filter_check, update_check, delete_check]):
            results.update_result("gratifications_crud", "pass", details)
        else:
            results.update_result("gratifications_crud", "fail", details)
            
    except Exception as e:
        results.update_result("gratifications_crud", "fail", f"Gratifications CRUD test error: {str(e)}")

def test_statistics_endpoints(results):
    """Test statistics endpoints"""
    if not results.session_token:
        results.update_result("statistics", "fail", "No valid session token for testing")
        return
    
    try:
        headers = {"Authorization": f"Bearer {results.session_token}"}
        
        # Create some test data first
        # Create a shift
        shift_data = {
            "date": "2025-02-15", 
            "shift_type": "tarde",
            "start_time": "16:00",
            "end_time": "00:00"
        }
        requests.post(f"{BASE_URL}/shifts", headers=headers, json=shift_data, timeout=10)
        
        # Create gratifications
        grat_data1 = {
            "date": "2025-02-15",
            "gratification_type": "hora_extra", 
            "value": 25.00,
            "note": "Stats test 1"
        }
        grat_data2 = {
            "date": "2025-02-16",
            "gratification_type": "premio",
            "value": 100.00, 
            "note": "Stats test 2"
        }
        requests.post(f"{BASE_URL}/gratifications", headers=headers, json=grat_data1, timeout=10)
        requests.post(f"{BASE_URL}/gratifications", headers=headers, json=grat_data2, timeout=10)
        
        # Test GET /stats/monthly/{month}
        response = requests.get(f"{BASE_URL}/stats/monthly/2025-02", headers=headers, timeout=10)
        if response.status_code == 200:
            monthly_stats = response.json()
            if monthly_stats.get("total_gratifications", 0) >= 125.00:
                monthly_check = f"✅ GET /stats/monthly/2025-02 works (total: €{monthly_stats['total_gratifications']})"
            else:
                monthly_check = f"❌ GET /stats/monthly/2025-02 total seems low: €{monthly_stats.get('total_gratifications', 0)}"
        else:
            monthly_check = f"❌ GET /stats/monthly/2025-02 failed: {response.status_code}"
        
        # Test GET /stats/yearly/{year}
        response = requests.get(f"{BASE_URL}/stats/yearly/2025", headers=headers, timeout=10)
        if response.status_code == 200:
            yearly_stats = response.json()
            yearly_check = f"✅ GET /stats/yearly/2025 works (total: €{yearly_stats.get('total_gratifications', 0)})"
        else:
            yearly_check = f"❌ GET /stats/yearly/2025 failed: {response.status_code}"
        
        # Test GET /stats/comparison
        response = requests.get(f"{BASE_URL}/stats/comparison", headers=headers, timeout=10)
        if response.status_code == 200:
            comparison_stats = response.json()
            if "months" in comparison_stats and len(comparison_stats["months"]) == 6:
                comparison_check = f"✅ GET /stats/comparison works (6 months data)"
            else:
                comparison_check = f"❌ GET /stats/comparison returned unexpected data structure"
        else:
            comparison_check = f"❌ GET /stats/comparison failed: {response.status_code}"
        
        details = f"{monthly_check}; {yearly_check}; {comparison_check}"
        
        if all("✅" in check for check in [monthly_check, yearly_check, comparison_check]):
            results.update_result("statistics", "pass", details)
        else:
            results.update_result("statistics", "fail", details)
            
    except Exception as e:
        results.update_result("statistics", "fail", f"Statistics test error: {str(e)}")

def cleanup_test_data(results):
    """Clean up test data"""
    if not results.user_id:
        return
    
    try:
        cleanup_cmd = f'''
        mongosh --eval "
        use('test_database');
        db.users.deleteMany({{'user_id': '{results.user_id}'}});
        db.user_sessions.deleteMany({{'user_id': '{results.user_id}'}});
        db.shifts.deleteMany({{'user_id': '{results.user_id}'}});
        db.gratifications.deleteMany({{'user_id': '{results.user_id}'}});
        print('Cleaned up test data for user: {results.user_id}');
        "
        '''
        subprocess.run(cleanup_cmd, shell=True, capture_output=True, text=True)
        print(f"🧹 Cleaned up test data for user: {results.user_id}")
        
    except Exception as e:
        print(f"⚠️  Error cleaning up test data: {e}")

def main():
    print("🚀 Starting ShiftExtra Backend API Tests")
    print(f"🎯 Testing backend URL: {BASE_URL}")
    print("="*60)
    
    results = TestResults()
    
    try:
        # Run all tests
        test_root_endpoint(results)
        test_auth_endpoints_exist(results)
        test_auth_session_creation(results)
        test_shifts_crud(results)
        test_bulk_shifts_endpoint(results)
        test_gratifications_crud(results)
        test_statistics_endpoints(results)
        
        # Print final results
        results.print_summary()
        
        # Check if all tests passed
        all_passed = all(result["status"] == "pass" for result in results.results.values())
        
        if all_passed:
            print("\n🎉 All tests PASSED! Backend API is working correctly.")
            return 0
        else:
            failed_tests = [name for name, result in results.results.items() if result["status"] == "fail"]
            print(f"\n❌ {len(failed_tests)} tests FAILED: {', '.join(failed_tests)}")
            return 1
            
    except KeyboardInterrupt:
        print("\n⚠️  Tests interrupted by user")
        return 1
    except Exception as e:
        print(f"\n💥 Unexpected error during testing: {e}")
        return 1
    finally:
        # Always clean up
        cleanup_test_data(results)

if __name__ == "__main__":
    sys.exit(main())
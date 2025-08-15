import os
import firebase_admin
from firebase_admin import credentials, firestore

cred = credentials.Certificate('complainsg_firestorekey.json')
firebase_admin.initialize_app(cred)

db = firestore.client()
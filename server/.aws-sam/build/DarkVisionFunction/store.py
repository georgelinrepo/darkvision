"""
Rating storage abstraction.

To swap backends: implement RatingStore and update handler.py to instantiate
the new class. The interface is intentionally minimal.
"""
import json
import boto3


class RatingStore:
    def get_rating(self, user_id: str) -> int:
        raise NotImplementedError

    def set_rating(self, user_id: str, rating: int) -> None:
        raise NotImplementedError


class S3RatingStore(RatingStore):
    """Stores one JSON file per user at s3://{bucket}/ratings/{user_id}.json"""

    def __init__(self, bucket: str):
        self._bucket = bucket
        self._s3 = boto3.client("s3")

    def get_rating(self, user_id: str) -> int:
        try:
            obj = self._s3.get_object(Bucket=self._bucket, Key=f"ratings/{user_id}.json")
            data = json.loads(obj["Body"].read())
            return int(data["rating"])
        except self._s3.exceptions.NoSuchKey:
            return 1500
        except Exception:
            return 1500

    def set_rating(self, user_id: str, rating: int) -> None:
        self._s3.put_object(
            Bucket=self._bucket,
            Key=f"ratings/{user_id}.json",
            Body=json.dumps({"rating": rating}),
            ContentType="application/json",
        )

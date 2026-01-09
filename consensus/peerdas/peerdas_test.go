// Copyright 2025 The Altcoinchain Authors
// This file contains tests for FUSAKA EIP-7594 PeerDAS implementation

package peerdas

import (
	"math/big"
	"testing"

	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/params"
)

func TestPeerDASIsActive(t *testing.T) {
	config := &params.ChainConfig{
		ChainID:     big.NewInt(2330),
		FusakaBlock: big.NewInt(0), // Activate FUSAKA immediately
	}

	peerdas := NewPeerDAS(config)

	// Should be active at block 0 and beyond
	if !peerdas.IsActive(big.NewInt(0)) {
		t.Error("PeerDAS should be active at block 0")
	}
	if !peerdas.IsActive(big.NewInt(100)) {
		t.Error("PeerDAS should be active at block 100")
	}

	// Should not be active before fork
	config.FusakaBlock = big.NewInt(100)
	peerdas = NewPeerDAS(config)
	if peerdas.IsActive(big.NewInt(99)) {
		t.Error("PeerDAS should not be active before fork")
	}
	if !peerdas.IsActive(big.NewInt(100)) {
		t.Error("PeerDAS should be active at fork block")
	}
}

func TestSampleData(t *testing.T) {
	config := &params.ChainConfig{
		ChainID:     big.NewInt(2330),
		FusakaBlock: big.NewInt(0),
	}

	peerdas := NewPeerDAS(config)
	blockNumber := big.NewInt(1)
	dataHash := common.HexToHash("0x1234567890abcdef")

	// Create test data
	testData := make([]byte, 2048) // 2KB of data
	for i := range testData {
		testData[i] = byte(i % 256)
	}

	// Sample the data
	samples, commitment, err := peerdas.SampleData(testData, blockNumber, dataHash)
	if err != nil {
		t.Fatalf("SampleData failed: %v", err)
	}

	if commitment == nil {
		t.Fatal("Commitment should not be nil")
	}

	if len(samples) == 0 {
		t.Fatal("Should have at least one sample")
	}

	// Verify commitment
	if commitment.BlockNumber.Cmp(blockNumber) != 0 {
		t.Errorf("Commitment block number mismatch: got %v, want %v", commitment.BlockNumber, blockNumber)
	}
	if commitment.DataHash != dataHash {
		t.Errorf("Commitment data hash mismatch: got %x, want %x", commitment.DataHash, dataHash)
	}
	if commitment.SampleCount != uint64(len(samples)) {
		t.Errorf("Sample count mismatch: got %d, want %d", commitment.SampleCount, len(samples))
	}

	// Verify each sample
	for i, sample := range samples {
		if sample.SampleIndex != uint64(i) {
			t.Errorf("Sample index mismatch: got %d, want %d", sample.SampleIndex, i)
		}
		if sample.BlockNumber.Cmp(blockNumber) != 0 {
			t.Errorf("Sample block number mismatch: got %v, want %v", sample.BlockNumber, blockNumber)
		}
		if sample.DataHash != dataHash {
			t.Errorf("Sample data hash mismatch: got %x, want %x", sample.DataHash, dataHash)
		}
		if len(sample.SampleData) == 0 {
			t.Errorf("Sample data should not be empty for sample %d", i)
		}
	}

	t.Logf("✅ Created %d samples with Merkle root %x", len(samples), commitment.MerkleRoot)
}

func TestVerifySample(t *testing.T) {
	config := &params.ChainConfig{
		ChainID:     big.NewInt(2330),
		FusakaBlock: big.NewInt(0),
	}

	peerdas := NewPeerDAS(config)
	blockNumber := big.NewInt(1)
	dataHash := common.HexToHash("0x1234567890abcdef")

	// Create test data and sample it
	testData := make([]byte, 1024)
	for i := range testData {
		testData[i] = byte(i % 256)
	}

	samples, commitment, err := peerdas.SampleData(testData, blockNumber, dataHash)
	if err != nil {
		t.Fatalf("SampleData failed: %v", err)
	}

	// Verify first sample
	err = peerdas.VerifySample(samples[0], commitment)
	if err != nil {
		t.Errorf("VerifySample failed: %v", err)
	}

	// Verify all samples
	for i, sample := range samples {
		if err := peerdas.VerifySample(sample, commitment); err != nil {
			t.Errorf("VerifySample failed for sample %d: %v", i, err)
		}
	}

	t.Logf("✅ Verified %d samples successfully", len(samples))
}

func TestPeerDASNotActive(t *testing.T) {
	config := &params.ChainConfig{
		ChainID:     big.NewInt(2330),
		FusakaBlock: big.NewInt(100), // FUSAKA not active yet
	}

	peerdas := NewPeerDAS(config)
	blockNumber := big.NewInt(50) // Before fork
	dataHash := common.HexToHash("0x1234567890abcdef")

	// Should fail before fork
	testData := make([]byte, 1024)
	_, _, err := peerdas.SampleData(testData, blockNumber, dataHash)
	if err != ErrPeerDASNotActive {
		t.Errorf("Expected ErrPeerDASNotActive, got %v", err)
	}

	// Sample should fail verification before fork
	sample := &DataSample{
		BlockNumber: blockNumber,
		DataHash:    dataHash,
		SampleIndex: 0,
		SampleData:  testData,
	}
	commitment := &SampleCommitment{
		BlockNumber: blockNumber,
		DataHash:    dataHash,
		MerkleRoot:  common.Hash{},
		SampleCount: 1,
	}

	err = peerdas.VerifySample(sample, commitment)
	if err != ErrPeerDASNotActive {
		t.Errorf("Expected ErrPeerDASNotActive, got %v", err)
	}
}

